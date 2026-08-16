"""Waiting for a program to stop, driven against a stubbed hub."""

import asyncio

import pytest

from spikeprime.client import Hub
from spikeprime.errors import HubNackError, HubTimeoutError


class StubHub(Hub):
    """A Hub with the BLE layer left out; only program-flow state is real."""

    def __init__(self, running: bool | None = True) -> None:
        self._running = running
        self._program_callbacks = []
        self.nack = False

    def finish(self) -> None:
        """Pretend the hub reported that its program stopped."""
        self._running = False
        for callback in list(self._program_callbacks):
            callback(True)

    async def _ack(self, message, response_type, operation, **kwargs):
        if self.nack:
            raise HubNackError(operation)
        return response_type()


async def test_wait_until_stopped_returns_when_the_program_finishes() -> None:
    hub = StubHub()
    waiter = asyncio.create_task(hub.wait_until_stopped())
    await asyncio.sleep(0)
    assert not waiter.done()
    hub.finish()
    await asyncio.wait_for(waiter, timeout=1)


async def test_wait_until_stopped_waits_indefinitely_by_default() -> None:
    """The default must not cap the wait: hub programs run as long as they like."""
    hub = StubHub()
    waiter = asyncio.create_task(hub.wait_until_stopped())
    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(asyncio.shield(waiter), timeout=0.2)
    assert not waiter.done()
    hub.finish()
    await asyncio.wait_for(waiter, timeout=1)


async def test_wait_until_stopped_honours_an_explicit_timeout() -> None:
    hub = StubHub()
    with pytest.raises(HubTimeoutError):
        await hub.wait_until_stopped(timeout=0.05)


async def test_wait_until_stopped_returns_at_once_if_already_stopped() -> None:
    hub = StubHub(running=False)
    await asyncio.wait_for(hub.wait_until_stopped(), timeout=1)


@pytest.mark.parametrize(
    "finish_run",
    [True, False],
    ids=["program-stops", "wait-times-out"],
)
async def test_wait_until_stopped_does_not_leak_callbacks(finish_run: bool) -> None:
    """A long session runs many programs over one link; the list must not grow."""
    hub = StubHub()
    for _ in range(3):
        hub._running = True
        if finish_run:
            waiter = asyncio.create_task(hub.wait_until_stopped())
            await asyncio.sleep(0)
            hub.finish()
            await waiter
        else:
            with pytest.raises(HubTimeoutError):
                await hub.wait_until_stopped(timeout=0.01)
    assert hub._program_callbacks == []


async def test_wait_until_stopped_cleans_up_when_already_stopped() -> None:
    hub = StubHub(running=False)
    await hub.wait_until_stopped()
    assert hub._program_callbacks == []


async def test_start_marks_running_again_after_an_earlier_program_finished() -> None:
    """One link, several programs: the second start must still count as running."""
    hub = StubHub(running=None)
    await hub.start(0)
    assert hub.running is True
    hub.finish()
    assert hub.running is False

    await hub.start(0)
    assert hub.running is True


async def test_second_run_over_one_link_does_not_report_stopped_at_once() -> None:
    hub = StubHub(running=None)
    await hub.start(0)
    hub.finish()

    await hub.start(0)
    waiter = asyncio.create_task(hub.wait_until_stopped())
    await asyncio.sleep(0)
    assert not waiter.done(), "second run reported finished before it had begun"
    hub.finish()
    await asyncio.wait_for(waiter, timeout=1)


async def test_a_program_that_ends_before_its_ack_stays_stopped() -> None:
    """The stop notification can beat the start acknowledgement; it must win."""

    class RacingHub(StubHub):
        async def _ack(self, message, response_type, operation, **kwargs):
            self.finish()  # the program ends while the start is still in flight
            return await super()._ack(message, response_type, operation, **kwargs)

    hub = RacingHub(running=None)
    await hub.start(0)
    assert hub.running is False


async def test_a_rejected_start_leaves_the_state_unknown() -> None:
    hub = StubHub(running=None)
    hub.nack = True
    with pytest.raises(HubNackError):
        await hub.start(0)
    assert hub.running is None
