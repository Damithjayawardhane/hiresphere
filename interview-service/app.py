from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.utils import secure_filename
from sqlalchemy import and_, or_, func, inspect, text
import datetime, os, uuid

from cognito_jwt import verify_bearer_token

app = Flask(__name__)
CORS(app, origins="*")
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'hiresphere-local-secret-2024')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///interview.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
UPLOAD_DIR = os.environ.get('UPLOAD_DIR', os.path.join(os.path.dirname(__file__), 'uploads'))
os.makedirs(UPLOAD_DIR, exist_ok=True)
db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*")


class FeedbackReport(db.Model):
    id                  = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    booking_id          = db.Column(db.String(36), nullable=False)
    interviewer_id      = db.Column(db.String(36), nullable=False)
    candidate_id        = db.Column(db.String(36), nullable=False)
    technical_score     = db.Column(db.Integer, default=0)
    communication_score = db.Column(db.Integer, default=0)
    problem_solving     = db.Column(db.Integer, default=0)
    overall_score       = db.Column(db.Integer, default=0)
    strengths           = db.Column(db.Text, default='')
    improvements        = db.Column(db.Text, default='')
    recommendation      = db.Column(db.String(20), default='Maybe')
    notes               = db.Column(db.Text, default='')
    created_at          = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {'id': self.id, 'booking_id': self.booking_id,
                'interviewer_id': self.interviewer_id, 'candidate_id': self.candidate_id,
                'technical_score': self.technical_score,
                'communication_score': self.communication_score,
                'problem_solving': self.problem_solving,
                'overall_score': self.overall_score,
                'strengths': self.strengths, 'improvements': self.improvements,
                'recommendation': self.recommendation, 'notes': self.notes,
                'created_at': self.created_at.isoformat()}


class ChallengeSubmission(db.Model):
    id           = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_id = db.Column(db.String(36), nullable=False)
    booking_id   = db.Column(db.String(36), default='')
    github_url   = db.Column(db.String(500), default='')
    file_name    = db.Column(db.String(260), default='')
    notes        = db.Column(db.Text, default='')
    annotation   = db.Column(db.Text, default='')
    annotated_by = db.Column(db.String(36), default='')
    annotated_at = db.Column(db.DateTime, nullable=True)
    created_at   = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'candidate_id': self.candidate_id, 'booking_id': self.booking_id,
            'github_url': self.github_url, 'file_name': self.file_name, 'notes': self.notes,
            'annotation': self.annotation, 'annotated_by': self.annotated_by,
            'annotated_at': self.annotated_at.isoformat() if self.annotated_at else None,
            'created_at': self.created_at.isoformat(),
        }


class Message(db.Model):
    id          = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    from_id     = db.Column(db.String(36), nullable=False)
    to_id       = db.Column(db.String(36), nullable=False)
    body        = db.Column(db.Text, nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {'id': self.id, 'from_id': self.from_id, 'to_id': self.to_id,
                'body': self.body, 'created_at': self.created_at.isoformat()}


def get_current_user():
    auth = request.headers.get('Authorization', '')
    token = auth.replace('Bearer ', '', 1).strip()
    if not token:
        return None
    return verify_bearer_token(token, app.config['SECRET_KEY'])


@app.route('/health')
def health():
    return jsonify({'service': 'interview', 'status': 'ok'})


@app.route('/feedback', methods=['POST'])
def submit_feedback():
    user = get_current_user()
    if not user or user['role'] != 'interviewer':
        return jsonify({'error': 'Only interviewers can submit feedback'}), 403
    data = request.get_json()
    required = ['booking_id', 'candidate_id', 'technical_score',
                'communication_score', 'problem_solving', 'overall_score', 'recommendation']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing fields'}), 400
    fb = FeedbackReport(
        booking_id=data['booking_id'], interviewer_id=user['sub'],
        candidate_id=data['candidate_id'],
        technical_score=data['technical_score'],
        communication_score=data['communication_score'],
        problem_solving=data['problem_solving'],
        overall_score=data['overall_score'],
        strengths=data.get('strengths', ''), improvements=data.get('improvements', ''),
        recommendation=data['recommendation'], notes=data.get('notes', '')
    )
    db.session.add(fb)
    db.session.commit()
    return jsonify(fb.to_dict()), 201


@app.route('/feedback/<candidate_id>', methods=['GET'])
def get_feedback(candidate_id):
    reports = FeedbackReport.query.filter_by(candidate_id=candidate_id).all()
    return jsonify([r.to_dict() for r in reports])


@app.route('/feedback/booking/<booking_id>', methods=['GET'])
def feedback_by_booking(booking_id):
    fb = FeedbackReport.query.filter_by(booking_id=booking_id).first()
    if not fb:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(fb.to_dict())


def migrate_schema():
    insp = inspect(db.engine)
    if not insp.has_table('challenge_submission'):
        return
    cols = {c['name'] for c in insp.get_columns('challenge_submission')}
    alters = []
    for col, sql in [
        ('annotation', "ALTER TABLE challenge_submission ADD COLUMN annotation TEXT DEFAULT ''"),
        ('annotated_by', "ALTER TABLE challenge_submission ADD COLUMN annotated_by VARCHAR(36) DEFAULT ''"),
        ('annotated_at', 'ALTER TABLE challenge_submission ADD COLUMN annotated_at DATETIME'),
    ]:
        if col not in cols:
            alters.append(sql)
    if alters:
        with db.engine.begin() as conn:
            for sql in alters:
                conn.execute(text(sql))


@app.route('/ratings/interviewers', methods=['GET'])
def interviewer_ratings():
    rows = (
        db.session.query(
            FeedbackReport.interviewer_id,
            func.avg(FeedbackReport.overall_score).label('avg'),
            func.count(FeedbackReport.id).label('cnt'),
        )
        .group_by(FeedbackReport.interviewer_id)
        .all()
    )
    out = {}
    for iid, avg, cnt in rows:
        # Feedback scores are 1–10; UI stars use 0–5
        raw = float(avg or 0)
        avg_f = round(max(0.0, min(5.0, raw / 2.0)), 1)
        badges = []
        if cnt >= 5:
            badges.append('Top Rated')
        if avg_f >= 4.5:
            badges.append('Expert')
        if avg_f >= 4.0 and 'Expert' not in badges:
            badges.append('Highly Rated')
        out[iid] = {'rating_avg': avg_f, 'rating_count': int(cnt), 'badges': badges}
    return jsonify(out)


@app.route('/submissions', methods=['GET'])
def list_submissions():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    if user['role'] == 'interviewer':
        rows = ChallengeSubmission.query.order_by(ChallengeSubmission.created_at.desc()).limit(100).all()
        return jsonify([r.to_dict() for r in rows])
    rows = ChallengeSubmission.query.filter_by(candidate_id=user['sub']).order_by(
        ChallengeSubmission.created_at.desc()).all()
    return jsonify([r.to_dict() for r in rows])


@app.route('/submissions/<submission_id>/annotate', methods=['PATCH'])
def annotate_submission(submission_id):
    user = get_current_user()
    if not user or user['role'] != 'interviewer':
        return jsonify({'error': 'Only interviewers can annotate'}), 403
    row = ChallengeSubmission.query.get_or_404(submission_id)
    data = request.get_json() or {}
    text_body = (data.get('annotation') or '').strip()
    if not text_body:
        return jsonify({'error': 'annotation text required'}), 400
    row.annotation = text_body[:10000]
    row.annotated_by = user['sub']
    row.annotated_at = datetime.datetime.utcnow()
    db.session.commit()
    return jsonify(row.to_dict())


@app.route('/submissions', methods=['POST'])
def create_submission():
    user = get_current_user()
    if not user or user['role'] != 'candidate':
        return jsonify({'error': 'Only candidates can submit'}), 403
    github_url = request.form.get('github_url', '').strip()
    booking_id = request.form.get('booking_id', '').strip()
    notes = request.form.get('notes', '').strip()
    file_name = ''
    if 'file' in request.files and request.files['file'].filename:
        f = request.files['file']
        safe = secure_filename(f.filename)
        if safe:
            uid = str(uuid.uuid4())[:8]
            stored = f"{uid}_{safe}"
            path = os.path.join(UPLOAD_DIR, stored)
            f.save(path)
            file_name = stored
    if not github_url and not file_name:
        return jsonify({'error': 'Provide a GitHub URL and/or a file'}), 400
    row = ChallengeSubmission(
        candidate_id=user['sub'], booking_id=booking_id,
        github_url=github_url, file_name=file_name, notes=notes)
    db.session.add(row)
    db.session.commit()
    return jsonify(row.to_dict()), 201


@app.route('/messages', methods=['GET'])
def list_messages():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    other = request.args.get('with')
    uid = user['sub']
    if not other:
        # Dashboard: all messages for this user (no thread filter)
        rows = Message.query.filter(
            or_(Message.from_id == uid, Message.to_id == uid)
        ).order_by(Message.created_at.asc()).all()
        return jsonify([m.to_dict() for m in rows])
    rows = Message.query.filter(
        or_(
            and_(Message.from_id == uid, Message.to_id == other),
            and_(Message.from_id == other, Message.to_id == uid),
        )
    ).order_by(Message.created_at.asc()).all()
    return jsonify([m.to_dict() for m in rows])


@app.route('/messages', methods=['POST'])
def send_message():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json()
    if not data or not data.get('to_id') or not data.get('body'):
        return jsonify({'error': 'Missing to_id or body'}), 400
    msg = Message(from_id=user['sub'], to_id=data['to_id'], body=data['body'].strip()[:8000])
    if not msg.body:
        return jsonify({'error': 'Empty message'}), 400
    db.session.add(msg)
    db.session.commit()
    return jsonify(msg.to_dict()), 201


@socketio.on('join_session')
def on_join(data):
    room = data.get('room')
    user = data.get('user', 'Anonymous')
    join_room(room)
    emit('user_joined', {'user': user, 'room': room, 'sid': request.sid}, room=room)


@socketio.on('leave_session')
def on_leave(data):
    room = data.get('room')
    user = data.get('user', 'Anonymous')
    leave_room(room)
    emit('user_left', {'user': user, 'sid': request.sid}, room=room)


@socketio.on('webrtc_offer')
def on_webrtc_offer(data):
    room = data.get('room')
    if room:
        payload = dict(data) if isinstance(data, dict) else {}
        payload['from_sid'] = request.sid
        emit('webrtc_offer', payload, room=room, skip_sid=request.sid)


@socketio.on('webrtc_answer')
def on_webrtc_answer(data):
    room = data.get('room')
    if room:
        payload = dict(data) if isinstance(data, dict) else {}
        payload['from_sid'] = request.sid
        emit('webrtc_answer', payload, room=room, skip_sid=request.sid)


@socketio.on('webrtc_ice')
def on_webrtc_ice(data):
    room = data.get('room')
    if room:
        payload = dict(data) if isinstance(data, dict) else {}
        payload['from_sid'] = request.sid
        emit('webrtc_ice', payload, room=room, skip_sid=request.sid)


@socketio.on('code_change')
def on_code_change(data):
    room = data.get('room')
    emit('code_update', {'code': data.get('code'), 'language': data.get('language', 'python'),
                         'user': data.get('user')}, room=room, include_self=False)


@socketio.on('chat_message')
def on_chat(data):
    room = data.get('room')
    emit('new_message', {'message': data.get('message'), 'user': data.get('user'),
                         'timestamp': datetime.datetime.utcnow().isoformat()}, room=room)


@socketio.on('cursor_move')
def on_cursor(data):
    room = data.get('room')
    emit('cursor_update', data, room=room, include_self=False)


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        migrate_schema()
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    socketio.run(app, host='0.0.0.0', port=5003, debug=debug, allow_unsafe_werkzeug=True)
