"""Protocol and connection errors."""


class HubError(Exception):
    """Base error for hub communication."""


class HubNotFoundError(HubError):
    """No matching hub was advertising the HubOS GATT service."""


class HubProtocolError(HubError):
    """Bytes from the hub could not be decoded, or a response was the wrong type."""


class HubNackError(HubError):
    """The hub returned Response Status 0x01 (Not Acknowledged)."""

    def __init__(self, operation: str) -> None:
        self.operation = operation
        super().__init__(f"{operation} was not acknowledged by the hub")


class HubTimeoutError(HubError):
    """A request did not receive its matching response in time."""


class BuildError(Exception):
    """A hub project could not be bundled into a single uploadable file."""
