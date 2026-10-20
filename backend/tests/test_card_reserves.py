import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.card_reserves import MISSED, PENDING, SAVED, reserve_flow  # noqa: E402


def test_future_reserves_are_planned_and_reduce_payment():
    entries, reserved, carried = reserve_flow({10: 50, 11: 30, 12: 20}, due_index=12, current_index=10, saved_indexes=set())
    assert [entries[i]['status'] for i in (10, 11)] == [PENDING, PENDING]
    assert reserved == 80
    assert carried == 0


def test_missed_reserve_rolls_into_next_quincena():
    entries, reserved, carried = reserve_flow({10: 50, 11: 30}, due_index=12, current_index=11, saved_indexes=set())
    assert entries[10] == {'own': 50, 'carried_in': 0, 'need': 50, 'amount': 0.0, 'status': MISSED}
    assert entries[11] == {'own': 30, 'carried_in': 50, 'need': 80, 'amount': 80, 'status': PENDING}
    assert reserved == 80
    assert carried == 0


def test_confirmed_reserve_stops_the_carry():
    entries, reserved, _ = reserve_flow({10: 50, 11: 30}, due_index=12, current_index=12, saved_indexes={10})
    assert entries[10]['status'] == SAVED
    assert entries[11]['status'] == MISSED
    assert reserved == 50


def test_unsaved_amount_reaches_the_payment():
    _, reserved, carried = reserve_flow({10: 50, 11: 30}, due_index=12, current_index=12, saved_indexes=set())
    assert reserved == 0
    assert carried == 80


def test_carry_crosses_quincenas_without_charges():
    entries, _, carried = reserve_flow({8: 40}, due_index=11, current_index=10, saved_indexes=set())
    assert entries[8]['status'] == MISSED
    assert entries[9] == {'own': 0, 'carried_in': 40, 'need': 40, 'amount': 0.0, 'status': MISSED}
    assert entries[10]['status'] == PENDING and entries[10]['amount'] == 40
    assert carried == 0


def test_charges_only_in_payment_quincena():
    assert reserve_flow({12: 25}, due_index=12, current_index=10, saved_indexes=set()) == ({}, 0.0, 0.0)
