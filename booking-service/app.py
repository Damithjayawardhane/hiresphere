from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy import inspect, text
import datetime, os, uuid, re

from cognito_jwt import verify_bearer_token
from resilience import check_auth_service_reachable

app = Flask(__name__)
CORS(app, origins='*')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'hiresphere-local-secret-2024')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///booking.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
AUTH_SERVICE = os.environ.get('AUTH_SERVICE_URL', 'http://localhost:5001')
db = SQLAlchemy(app)


class Booking(db.Model):
    id                  = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_id        = db.Column(db.String(36), nullable=False)
    interviewer_id      = db.Column(db.String(36), nullable=False)
    session_type        = db.Column(db.String(50), default='DSA')
    scheduled_at        = db.Column(db.DateTime, nullable=False)
    duration_mins       = db.Column(db.Integer, default=60)
    status              = db.Column(db.String(30), default='awaiting_payment')
    price               = db.Column(db.Float, default=0.0)
    notes               = db.Column(db.Text, default='')
    payment_status      = db.Column(db.String(20), default='unpaid')
    payment_reference   = db.Column(db.String(120), default='')
    recording_url       = db.Column(db.String(500), default='')
    created_at          = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'candidate_id': self.candidate_id,
            'interviewer_id': self.interviewer_id, 'session_type': self.session_type,
            'scheduled_at': self.scheduled_at.isoformat(),
            'duration_mins': self.duration_mins, 'status': self.status,
            'price': self.price, 'notes': self.notes,
            'payment_status': self.payment_status,
            'payment_reference': self.payment_reference,
            'recording_url': self.recording_url,
            'created_at': self.created_at.isoformat(),
        }


class InterviewPackage(db.Model):
    id             = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    interviewer_id = db.Column(db.String(36), nullable=False)
    title          = db.Column(db.String(120), nullable=False)
    description    = db.Column(db.Text, default='')
    session_count  = db.Column(db.Integer, default=3)
    price          = db.Column(db.Float, default=0.0)
    active         = db.Column(db.Boolean, default=True)
    created_at     = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'interviewer_id': self.interviewer_id,
            'title': self.title, 'description': self.description,
            'session_count': self.session_count, 'price': self.price,
            'active': self.active, 'created_at': self.created_at.isoformat(),
        }


def migrate_schema():
    insp = inspect(db.engine)
    if not insp.has_table('booking'):
        return
    cols = {c['name'] for c in insp.get_columns('booking')}
    alters = []
    if 'payment_status' not in cols:
        alters.append("ALTER TABLE booking ADD COLUMN payment_status VARCHAR(20) DEFAULT 'paid'")
    if 'payment_reference' not in cols:
        alters.append("ALTER TABLE booking ADD COLUMN payment_reference VARCHAR(120) DEFAULT ''")
    if 'recording_url' not in cols:
        alters.append("ALTER TABLE booking ADD COLUMN recording_url VARCHAR(500) DEFAULT ''")
    if alters:
        with db.engine.begin() as conn:
            for sql in alters:
                conn.execute(text(sql))


def get_current_user():
    auth = request.headers.get('Authorization', '')
    token = auth.replace('Bearer ', '', 1).strip()
    return verify_bearer_token(token, app.config['SECRET_KEY'])


def _normalize_card_digits(card_number: str) -> str:
    return re.sub(r'\D', '', card_number or '')


def _is_approved_test_card(card_number: str) -> bool:
    digits = _normalize_card_digits(card_number)
    return digits.startswith('424242424242') and len(digits) >= 12


def _is_declined_test_card(card_number: str) -> bool:
    digits = _normalize_card_digits(card_number)
    return digits.startswith('4000000000000002')


@app.route('/health')
def health():
    auth_ok, degraded = check_auth_service_reachable()
    return jsonify({
        'service': 'booking',
        'status': 'ok',
        'auth_service': 'reachable' if auth_ok else 'unreachable',
        'degraded_mode': degraded and not auth_ok,
    })


@app.route('/bookings', methods=['GET'])
def list_bookings():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    if user['role'] == 'candidate':
        bookings = Booking.query.filter_by(candidate_id=user['sub']).all()
    else:
        bookings = Booking.query.filter_by(interviewer_id=user['sub']).all()
    return jsonify([b.to_dict() for b in bookings])


@app.route('/bookings', methods=['POST'])
def create_booking():
    user = get_current_user()
    if not user or user['role'] != 'candidate':
        return jsonify({'error': 'Only candidates can book sessions'}), 403
    data = request.get_json()
    required = ['interviewer_id', 'session_type', 'scheduled_at']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing fields'}), 400
    try:
        scheduled = datetime.datetime.fromisoformat(data['scheduled_at'])
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use ISO format.'}), 400
    booking = Booking(
        candidate_id=user['sub'],
        interviewer_id=data['interviewer_id'],
        session_type=data['session_type'],
        scheduled_at=scheduled,
        duration_mins=data.get('duration_mins', 60),
        price=float(data.get('price', 0.0)),
        notes=data.get('notes', ''),
        status='awaiting_payment',
        payment_status='unpaid',
        payment_reference='',
    )
    db.session.add(booking)
    db.session.commit()
    return jsonify(booking.to_dict()), 201


@app.route('/bookings/<booking_id>/pay', methods=['POST'])
def pay_booking(booking_id):
    """Simulated PCI-aware payment (Stripe test PAN 4242… = success). Integrate Stripe SDK here for production."""
    user = get_current_user()
    if not user or user['role'] != 'candidate':
        return jsonify({'error': 'Only the candidate can pay for this booking'}), 403
    b = Booking.query.get_or_404(booking_id)
    if b.candidate_id != user['sub']:
        return jsonify({'error': 'Forbidden'}), 403
    if b.status != 'awaiting_payment':
        return jsonify({'error': 'Booking is not awaiting payment'}), 400
    if b.payment_status == 'paid':
        return jsonify({'error': 'Already paid'}), 400
    data = request.get_json() or {}
    card = data.get('card_number', '')
    if _is_declined_test_card(card):
        return jsonify({'error': 'Card declined (simulator: use 4242… test PAN for success)'}), 402
    if not _is_approved_test_card(card):
        return jsonify({'error': 'Invalid or unsupported card (demo: use 4242424242424242)'}), 400
    ref = f'mock_pi_{uuid.uuid4().hex[:24]}'
    b.payment_status = 'paid'
    b.payment_reference = ref
    b.status = 'pending'
    db.session.commit()
    return jsonify({'paid': True, 'payment_reference': ref, 'booking': b.to_dict()})


@app.route('/bookings/<booking_id>', methods=['GET'])
def get_booking(booking_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    b = Booking.query.get_or_404(booking_id)
    if user['sub'] not in (b.candidate_id, b.interviewer_id):
        return jsonify({'error': 'Forbidden'}), 403
    return jsonify(b.to_dict())


@app.route('/bookings/<booking_id>/status', methods=['PATCH'])
def update_status(booking_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    b = Booking.query.get_or_404(booking_id)
    new_status = request.get_json().get('status')
    valid = ['awaiting_payment', 'pending', 'confirmed', 'completed', 'cancelled']
    if new_status not in valid:
        return jsonify({'error': f'Status must be one of {valid}'}), 400

    if user['role'] == 'interviewer':
        if b.interviewer_id != user['sub']:
            return jsonify({'error': 'Forbidden'}), 403
        if new_status not in ('confirmed', 'completed', 'cancelled'):
            return jsonify({'error': 'Interviewers may only confirm, complete, or cancel'}), 400
        if new_status == 'confirmed' and b.status != 'pending':
            return jsonify({'error': 'Can only confirm bookings that are pending (paid)'}), 400
        if new_status == 'completed' and b.status != 'confirmed':
            return jsonify({'error': 'Can only complete confirmed sessions'}), 400
        if new_status == 'cancelled' and b.status not in ('pending', 'confirmed'):
            return jsonify({'error': 'Invalid transition'}), 400
    elif user['role'] == 'candidate':
        if b.candidate_id != user['sub']:
            return jsonify({'error': 'Forbidden'}), 403
        if new_status != 'cancelled':
            return jsonify({'error': 'Candidates can only cancel'}), 403
        if b.status in ('completed', 'cancelled'):
            return jsonify({'error': 'Booking already closed'}), 400
    else:
        return jsonify({'error': 'Forbidden'}), 403

    b.status = new_status
    db.session.commit()
    return jsonify(b.to_dict())


@app.route('/bookings/<booking_id>/recording', methods=['PATCH'])
def set_recording(booking_id):
    user = get_current_user()
    if not user or user['role'] != 'interviewer':
        return jsonify({'error': 'Only interviewers can attach recordings'}), 403
    b = Booking.query.get_or_404(booking_id)
    if b.interviewer_id != user['sub']:
        return jsonify({'error': 'Forbidden'}), 403
    url = (request.get_json() or {}).get('recording_url', '').strip()
    if not url:
        return jsonify({'error': 'recording_url required'}), 400
    b.recording_url = url[:500]
    db.session.commit()
    return jsonify(b.to_dict())


@app.route('/packages', methods=['GET'])
def list_packages():
    iid = request.args.get('interviewer_id')
    q = InterviewPackage.query.filter_by(active=True)
    if iid:
        q = q.filter_by(interviewer_id=iid)
    return jsonify([p.to_dict() for p in q.order_by(InterviewPackage.created_at.desc()).all()])


@app.route('/packages', methods=['POST'])
def create_package():
    user = get_current_user()
    if not user or user['role'] != 'interviewer':
        return jsonify({'error': 'Only interviewers can create packages'}), 403
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'title required'}), 400
    pkg = InterviewPackage(
        interviewer_id=user['sub'],
        title=title,
        description=data.get('description', ''),
        session_count=int(data.get('session_count', 3)),
        price=float(data.get('price', 0)),
        active=True,
    )
    db.session.add(pkg)
    db.session.commit()
    return jsonify(pkg.to_dict()), 201


@app.route('/bookings/all', methods=['GET'])
def all_bookings():
    return jsonify([b.to_dict() for b in Booking.query.all()])


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        migrate_schema()
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(host='0.0.0.0', port=5002, debug=debug)
