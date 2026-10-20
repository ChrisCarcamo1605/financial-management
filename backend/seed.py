"""Carga un usuario demo con ~6 meses de datos coherentes para desarrollo.

Usage:
    python seed.py            # crea el usuario demo si no existe
    python seed.py --reset    # borra el usuario demo y lo vuelve a crear

Por seguridad solo corre contra una base local (localhost); usa --allow-remote para otra.

Credenciales: demo@caudal.app / demo1234
"""
import argparse
import calendar
import random
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.engine import make_url

from app import create_app
from models import db
from models.account import Account
from models.budget import Budget
from models.category import Category
from models.income_source import IncomeSource
from models.loan import Loan
from models.recurring_service import RecurringService
from models.savings_contribution import SavingsContribution
from models.savings_goal import SavingsGoal
from models.transaction import Transaction
from models.transfer import Transfer
from models.user import User
from models.user_preferences import UserPreferences
from services.auth_service import AuthService
from services.loan_payment import sync_loan_from_transactions
from services.loan_schedule import build_schedule
from services.salary_calc import calculate_deductions

DEMO_EMAIL = 'demo@caudal.app'
DEMO_PASSWORD = 'demo1234'
MONTHS_BACK = 6
LOCAL_HOSTS = {'localhost', '127.0.0.1', 'db'}

EXPENSE_CATEGORIES = [
    ('Supermercado', 'cart', '#10b981'),
    ('Restaurantes', 'food', '#f59e0b'),
    ('Transporte', 'car', '#3b82f6'),
    ('Combustible', 'fuel', '#6366f1'),
    ('Servicios', 'zap', '#eab308'),
    ('Internet y teléfono', 'wifi', '#06b6d4'),
    ('Suscripciones', 'tv', '#ec4899'),
    ('Salud', 'health', '#f43f5e'),
    ('Compras', 'bag', '#a855f7'),
    ('Hogar', 'home', '#f97316'),
    ('Gimnasio', 'gym', '#14b8a6'),
    ('Préstamos', 'money', '#db2777'),
    ('Ahorro', 'savings', '#8b5cf6'),
]
INCOME_CATEGORIES = [
    ('Salario', 'work', '#10b981'),
    ('Freelance', 'laptop', '#06b6d4'),
    ('Otros ingresos', 'gift', '#22c55e'),
]


def clamp_day(year, month, day):
    return date(year, month, min(day, calendar.monthrange(year, month)[1]))


def add_months(d, months):
    m = d.month - 1 + months
    return clamp_day(d.year + m // 12, m % 12 + 1, d.day)


class Seeder:
    def __init__(self, user):
        self.user = user
        self.uid = str(user.id)
        self.today = date.today()
        self.start = add_months(self.today.replace(day=1), -MONTHS_BACK)
        self.rng = random.Random(7)
        self.cat = {}
        self.acc = {}

    # ── Catálogos ────────────────────────────────────────────────────────
    def categories(self):
        for kind, items in (('expense', EXPENSE_CATEGORIES), ('income', INCOME_CATEGORIES)):
            for name, icon, color in items:
                c = Category(user_id=self.uid, name=name, type=kind, color=color, icon=icon, icon_type='registry')
                db.session.add(c)
                self.cat[name] = c
        db.session.flush()

    def accounts(self):
        defs = {
            'nomina': dict(name='Banco Agrícola · Nómina', balance=Decimal('850')),
            'ahorro': dict(name='Cuscatlán · Ahorro', balance=Decimal('2400')),
            'efectivo': dict(name='Efectivo', balance=Decimal('120')),
            'visa': dict(name='Visa Oro', balance=Decimal('0'), type='tarjeta_credito',
                         credit_limit=Decimal('2500'), cutoff_day=20, payment_due_day=5,
                         start_date=self.start),
        }
        for key, fields in defs.items():
            a = Account(user_id=self.uid, currency='USD', **fields)
            db.session.add(a)
            self.acc[key] = a
        db.session.flush()

    def income_sources(self):
        self.salary = IncomeSource(user_id=self.uid, name='Salario · Grupo Andino', modality='planilla',
                                   gross_amount=Decimal('1450'), pay_schedule='biweekly',
                                   account_id=self.acc['nomina'].id, category_id=self.cat['Salario'].id)
        self.freelance = IncomeSource(user_id=self.uid, name='Diseño freelance', modality='servicios_profesionales',
                                      gross_amount=Decimal('350'), pay_schedule='monthly', pay_day=20,
                                      account_id=self.acc['nomina'].id, category_id=self.cat['Freelance'].id)
        db.session.add_all([self.salary, self.freelance])
        db.session.flush()

    def services(self):
        defs = [
            ('Luz · CAESS', 38, 8, 'Servicios', 'nomina', 'zap'),
            ('Agua · ANDA', 12, 12, 'Servicios', 'nomina', 'water'),
            ('Internet · Tigo', 35, 18, 'Internet y teléfono', 'visa', 'wifi'),
            ('Netflix', 15.49, 3, 'Suscripciones', 'visa', 'tv'),
            ('Spotify', 11.99, 22, 'Suscripciones', 'visa', 'music'),
            ('Teléfono · Claro', 20, 26, 'Internet y teléfono', 'nomina', 'phone'),
            ('Gimnasio', 30, 1, 'Gimnasio', 'visa', 'gym'),
        ]
        self.svc = []
        for name, amount, day, cat, acc, icon in defs:
            s = RecurringService(user_id=self.uid, name=name, amount=Decimal(str(amount)), day_of_month=day,
                                 category_id=self.cat[cat].id, account_id=self.acc[acc].id,
                                 icon=icon, icon_type='registry', active=True)
            db.session.add(s)
            self.svc.append(s)
        db.session.flush()

    def loan(self):
        self.car_loan = Loan(user_id=self.uid, name='Préstamo vehículo', principal=Decimal('9000'),
                             interest_rate=Decimal('9.5'), interest_method='french', payment_type='monthly',
                             installments=48, payment_day=25, start_date=self.start,
                             income_source_id=self.salary.id, category_id=self.cat['Préstamos'].id,
                             account_id=self.acc['nomina'].id)
        db.session.add(self.car_loan)
        db.session.flush()

    def goals(self):
        self.goal_emergency = SavingsGoal(user_id=self.uid, name='Fondo de emergencia', target_amount=Decimal('3000'),
                                          current_amount=Decimal('600'), per_quincena=Decimal('100'),
                                          per_quincena_q1=Decimal('50'), account_id=self.acc['nomina'].id,
                                          day_q1=15, day_q2=30, color='#10b981', icon='savings', icon_type='registry')
        self.goal_trip = SavingsGoal(user_id=self.uid, name='Viaje a Antigua', target_amount=Decimal('800'),
                                     current_amount=Decimal('0'), per_quincena=Decimal('60'),
                                     per_quincena_q1=Decimal('30'), account_id=self.acc['nomina'].id,
                                     day_q1=15, day_q2=30, color='#06b6d4', icon='plane', icon_type='registry')
        db.session.add_all([self.goal_emergency, self.goal_trip])
        db.session.flush()

    def budgets(self):
        defs = [('Supermercado', 280, 'monthly', 1), ('Restaurantes', 70, 'biweekly', None),
                ('Suscripciones', 45, 'monthly', 1), ('Combustible', 30, 'weekly', 1), ('Compras', 120, 'monthly', 1)]
        for cat, amount, period, start_day in defs:
            db.session.add(Budget(user_id=self.uid, category_id=self.cat[cat].id, amount=Decimal(str(amount)),
                                  period=period, start_day=start_day, start_date=self.start))

    # ── Movimientos ──────────────────────────────────────────────────────
    def tx(self, day, kind, amount, cat, acc, description, **extra):
        amount = Decimal(str(round(amount, 2)))
        account = self.acc[acc]
        account.balance += amount if kind == 'income' else -amount
        t = Transaction(user_id=self.uid, account_id=account.id, category_id=self.cat[cat].id,
                        amount=amount, type=kind, description=description, date=day, **extra)
        db.session.add(t)
        return t

    def transfer(self, day, src, dst, amount, description):
        amount = Decimal(str(round(amount, 2)))
        self.acc[src].balance -= amount
        self.acc[dst].balance += amount
        db.session.add(Transfer(user_id=self.uid, from_account_id=self.acc[src].id,
                                to_account_id=self.acc[dst].id, amount=amount, date=day, description=description))

    def contribute(self, goal, day, amount, qnum):
        self.tx(day, 'expense', amount, 'Ahorro', 'nomina', f'Ahorro · {goal.name}')
        goal.current_amount += Decimal(str(amount))
        db.session.add(SavingsContribution(savings_goal_id=goal.id, user_id=self.uid, amount=Decimal(str(amount)),
                                           date=day, source='auto',
                                           quincena_period=f'{day.year}-{day.month:02d}-Q{qnum}'))

    def daily_life(self, day):
        r = self.rng
        weekday = day.weekday()
        if weekday == 5:
            self.tx(day, 'expense', r.uniform(45, 85), 'Supermercado', r.choice(['nomina', 'visa']),
                    r.choice(['Super Selectos', 'Walmart', 'La Despensa de Don Juan']))
        if weekday == 0:
            self.tx(day, 'expense', r.uniform(22, 32), 'Combustible', 'visa', r.choice(['Puma', 'Texaco', 'Uno']))
        if r.random() < 0.28:
            self.tx(day, 'expense', r.uniform(6, 24), 'Restaurantes', r.choice(['visa', 'efectivo', 'nomina']),
                    r.choice(['Pupusería La Ceiba', 'Pollo Campero', 'Café Bariloche', 'Wendy\'s', 'Sushi Itto']))
        if r.random() < 0.08:
            self.tx(day, 'expense', r.uniform(3, 12), 'Transporte', 'efectivo', r.choice(['Uber', 'Taxi', 'Parqueo']))
        if r.random() < 0.05:
            self.tx(day, 'expense', r.uniform(18, 110), 'Compras', 'visa',
                    r.choice(['Siman', 'Amazon', 'Librería Cervantes', 'Ferretería Vidrí']))
        if r.random() < 0.025:
            self.tx(day, 'expense', r.uniform(12, 60), 'Salud', 'nomina', r.choice(['Farmacia San Nicolás', 'Consulta']))
        if r.random() < 0.02:
            self.tx(day, 'expense', r.uniform(15, 70), 'Hogar', 'nomina', r.choice(['Limpieza', 'Reparación', 'Decoración']))

    def movements(self):
        salary_net = calculate_deductions(float(self.salary.gross_amount), 'planilla')['net']
        freelance_net = calculate_deductions(float(self.freelance.gross_amount), 'servicios_profesionales')['net']
        schedule = {p['due_date']: p for p in build_schedule(
            principal=9000, interest_rate=9.5, interest_method='french', payment_type='monthly',
            installments=48, payment_day=25, start_date=self.start)}
        card = self.acc['visa']
        card_debt_at_cutoff = Decimal('0')
        category_names = {c.id: name for name, c in self.cat.items()}

        day = self.start
        while day <= self.today:
            last = calendar.monthrange(day.year, day.month)[1]
            if day.day in (15, min(30, last)):
                self.tx(day, 'income', salary_net / 2, 'Salario', 'nomina', 'Salario quincenal')
                self.transfer(day, 'nomina', 'efectivo', 60, 'Retiro cajero')
                qnum = 1 if day.day == 15 else 2
                self.contribute(self.goal_emergency, day, 50, qnum)
                self.contribute(self.goal_trip, day, 30, qnum)
            if day.day == 20:
                self.tx(day, 'income', freelance_net, 'Freelance', 'nomina', 'Proyecto de diseño')
            for s in self.svc:
                if clamp_day(day.year, day.month, s.day_of_month) == day:
                    acc_key = 'visa' if s.account_id == card.id else 'nomina'
                    self.tx(day, 'expense', float(s.amount), category_names[s.category_id], acc_key,
                            s.name, recurring_service_id=s.id)
            if day in schedule:
                p = schedule[day]
                self.tx(day, 'expense', p['amount'], 'Préstamos', 'nomina',
                        f'Préstamo vehículo · cuota {p["installment_number"]}', loan_id=self.car_loan.id)
            if day.day == card.cutoff_day:
                card_debt_at_cutoff = max(-card.balance, Decimal('0'))
            if day.day == card.payment_due_day and card_debt_at_cutoff > 0:
                self.transfer(day, 'nomina', 'visa', float(card_debt_at_cutoff), 'Pago Visa Oro')
                card_debt_at_cutoff = Decimal('0')
            self.daily_life(day)
            day += timedelta(days=1)

        self.tx(self.today - timedelta(days=9), 'income', 75, 'Otros ingresos', 'efectivo', 'Venta de bicicleta')

    def run(self):
        self.categories()
        self.accounts()
        self.income_sources()
        self.services()
        self.loan()
        self.goals()
        self.budgets()
        self.movements()
        db.session.flush()
        sync_loan_from_transactions(self.car_loan)
        db.session.add(UserPreferences(user_id=self.uid))
        db.session.commit()


def delete_user_data(user):
    uid = str(user.id)
    for model in (SavingsContribution, Transaction, Transfer, Budget, SavingsGoal, RecurringService,
                  Loan, IncomeSource, Account, Category, UserPreferences):
        for row in model.query.filter_by(user_id=uid).all():
            db.session.delete(row)
    db.session.delete(user)
    db.session.commit()


def main():
    parser = argparse.ArgumentParser(description='Seed demo data')
    parser.add_argument('--reset', action='store_true', help='delete and recreate the demo user')
    parser.add_argument('--allow-remote', action='store_true', help='allow seeding a non-local database')
    args = parser.parse_args()

    app = create_app()
    host = make_url(app.config['SQLALCHEMY_DATABASE_URI']).host or ''
    if host not in LOCAL_HOSTS and not args.allow_remote:
        raise SystemExit(f'Seed bloqueado: la base de datos es remota ({host}). Usa --allow-remote si es intencional.')

    with app.app_context():
        db.create_all()
        user = User.query.filter_by(email=DEMO_EMAIL).first()
        if user and not args.reset:
            print(f'{DEMO_EMAIL} ya existe (usa --reset para recrearlo)')
            return
        if user:
            delete_user_data(user)
        user = User(email=DEMO_EMAIL, password_hash=AuthService.hash_password(DEMO_PASSWORD))
        db.session.add(user)
        db.session.flush()
        Seeder(user).run()
        print(f'Usuario demo listo: {DEMO_EMAIL} / {DEMO_PASSWORD}')


if __name__ == '__main__':
    main()
