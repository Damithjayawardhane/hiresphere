from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import inspect, text
import jwt, datetime, os, uuid

from cognito_jwt import verify_bearer_token

app = Flask(__name__)
CORS(app, origins="*")
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'hiresphere-local-secret-2024')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///auth.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


class User(db.Model):
    id         = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name       = db.Column(db.String(100), nullable=False)
    email      = db.Column(db.String(120), unique=True, nullable=False)
    password   = db.Column(db.String(200), nullable=False)
    role       = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    bio        = db.Column(db.Text, default='')
    company    = db.Column(db.String(100), default='')
    skills     = db.Column(db.String(300), default='')
    rate       = db.Column(db.Float, default=60.0)
    domain            = db.Column(db.String(80), default='')
    interview_types   = db.Column(db.String(200), default='')
    experience_level  = db.Column(db.String(40), default='')
    availability      = db.Column(db.String(200), default='')
    badges            = db.Column(db.String(300), default='')

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'email': self.email,
            'role': self.role, 'bio': self.bio, 'company': self.company,
            'skills': self.skills, 'rate': self.rate,
            'domain': self.domain, 'interview_types': self.interview_types,
            'experience_level': self.experience_level, 'availability': self.availability,
            'badges': self.badges,
            'created_at': self.created_at.isoformat()
        }


def make_token(user):
    payload = {'sub': user.id, 'email': user.email, 'role': user.role,
               'name': user.name, 'iat': datetime.datetime.utcnow(),
               'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=8)}
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')


def verify_token(token):
    try:
        return jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
    except Exception:
        return None


def migrate_schema():
    insp = inspect(db.engine)
    if not insp.has_table('user'):
        return
    cols = {c['name'] for c in insp.get_columns('user')}
    alters = []
    for col, sql in [
        ('domain', "ALTER TABLE user ADD COLUMN domain VARCHAR(80) DEFAULT ''"),
        ('interview_types', "ALTER TABLE user ADD COLUMN interview_types VARCHAR(200) DEFAULT ''"),
        ('experience_level', "ALTER TABLE user ADD COLUMN experience_level VARCHAR(40) DEFAULT ''"),
        ('availability', "ALTER TABLE user ADD COLUMN availability VARCHAR(200) DEFAULT ''"),
        ('badges', "ALTER TABLE user ADD COLUMN badges VARCHAR(300) DEFAULT ''"),
    ]:
        if col not in cols:
            alters.append(sql)
    if alters:
        with db.engine.begin() as conn:
            for sql in alters:
                conn.execute(text(sql))


@app.route('/health')
def health():
    return jsonify({'service': 'auth', 'status': 'ok'})


@app.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    if not all(k in data for k in ['name', 'email', 'password', 'role']):
        return jsonify({'error': 'Missing fields'}), 400
    if data['role'] not in ('candidate', 'interviewer'):
        return jsonify({'error': 'Invalid role'}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409
    user = User(
        name=data['name'], email=data['email'],
        password=generate_password_hash(data['password']),
        role=data['role'], bio=data.get('bio', ''),
        company=data.get('company', ''), skills=data.get('skills', ''),
        rate=float(data.get('rate', 60.0)),
        domain=data.get('domain', ''),
        interview_types=data.get('interview_types', ''),
        experience_level=data.get('experience_level', ''),
        availability=data.get('availability', ''),
        badges=data.get('badges', ''),
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'token': make_token(user), 'user': user.to_dict()}), 201


@app.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email', '')).first()
    if not user or not check_password_hash(user.password, data.get('password', '')):
        return jsonify({'error': 'Invalid credentials'}), 401
    return jsonify({'token': make_token(user), 'user': user.to_dict()})


@app.route('/auth/cognito-sync', methods=['POST'])
def cognito_sync():
    auth = request.headers.get('Authorization', '')
    token = auth.replace('Bearer ', '', 1).strip()
    claims = verify_bearer_token(token, app.config['SECRET_KEY'])
    if not claims or not claims.get('sub'):
        return jsonify({'error': 'Invalid or unsupported token'}), 401
    data = request.get_json(silent=True) or {}
    uid = claims['sub']
    role = claims.get('role') or 'candidate'
    if role not in ('candidate', 'interviewer'):
        role = 'candidate'
    email = claims.get('email') or data.get('email')
    if not email:
        return jsonify({'error': 'Email required in Cognito profile'}), 400
    name = (data.get('name') or claims.get('name') or email.split('@')[0]).strip() or 'User'
    user = User.query.get(uid)
    if user is None:
        conflict = User.query.filter(User.email == email, User.id != uid).first()
        if conflict:
            return jsonify({'error': 'Email already linked to another account'}), 409
        user = User(
            id=uid,
            name=name,
            email=email,
            password=generate_password_hash(os.urandom(24).hex()),
            role=role,
            bio=data.get('bio', ''),
            company=data.get('company', ''),
            skills=data.get('skills', ''),
            rate=float(data.get('rate', 60) or 60),
            domain=data.get('domain', ''),
            interview_types=data.get('interview_types', ''),
            experience_level=data.get('experience_level', ''),
            availability=data.get('availability', ''),
            badges=data.get('badges', ''),
        )
        db.session.add(user)
    else:
        user.name = name
        user.email = email
        user.role = role
        if 'bio' in data:
            user.bio = data['bio']
        if 'company' in data:
            user.company = data['company']
        if 'skills' in data:
            user.skills = data['skills']
        if 'rate' in data and data['rate'] is not None:
            user.rate = float(data['rate'])
        if 'domain' in data:
            user.domain = data['domain']
        if 'interview_types' in data:
            user.interview_types = data['interview_types']
        if 'experience_level' in data:
            user.experience_level = data['experience_level']
        if 'availability' in data:
            user.availability = data['availability']
        if 'badges' in data:
            user.badges = data['badges']
    db.session.commit()
    return jsonify({'user': user.to_dict()})


@app.route('/auth/verify', methods=['POST'])
def verify():
    payload = verify_token(request.get_json().get('token', ''))
    if not payload:
        return jsonify({'valid': False}), 401
    return jsonify({'valid': True, 'payload': payload})


@app.route('/auth/users', methods=['GET'])
def list_users():
    role = request.args.get('role')
    q = User.query.filter_by(role=role) if role else User.query
    return jsonify([u.to_dict() for u in q.all()])


@app.route('/auth/users/<user_id>', methods=['GET'])
def get_user(user_id):
    return jsonify(User.query.get_or_404(user_id).to_dict())


def seed():
    if User.query.count() > 0:
        return
    users = [
        User(name='Alice Johnson', email='alice@hiresphere.com',
             password=generate_password_hash('password123'), role='interviewer',
             bio='Senior SWE at Google, 8 yrs exp.', company='Google',
             skills='DSA, System Design', rate=80,
             domain='Backend', interview_types='DSA, System Design',
             experience_level='Senior', availability='Weekday evenings UTC',
             badges='FAANG,Top Rated,System Design'),
        User(name='Bob Smith', email='bob@hiresphere.com',
             password=generate_password_hash('password123'), role='interviewer',
             bio='Staff Engineer at Meta.', company='Meta',
             skills='React, Node.js, Frontend', rate=70,
             domain='Frontend', interview_types='DSA, Behavioral',
             experience_level='Staff', availability='Weekends',
             badges='React,Behavioral,Highly Rated'),
        User(name='Carol Lee', email='carol@hiresphere.com',
             password=generate_password_hash('password123'), role='interviewer',
             bio='Principal Engineer at Amazon.', company='Amazon',
             skills='System Design, Cloud, AWS', rate=90,
             domain='DevOps', interview_types='System Design, Behavioral',
             experience_level='Principal', availability='Flexible — book 48h ahead',
             badges='AWS,Principal,Expert'),
        User(name='Demo Candidate', email='candidate@hiresphere.com',
             password=generate_password_hash('password123'), role='candidate',
             bio='CS grad seeking first SWE role.', skills='Python, JavaScript, React'),
    ]
    for u in users:
        db.session.add(u)
    db.session.commit()
    print('[auth-service] Demo users seeded.')


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        migrate_schema()
        seed()
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(host='0.0.0.0', port=5001, debug=debug)
