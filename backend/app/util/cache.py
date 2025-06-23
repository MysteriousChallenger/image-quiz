from dataclasses import dataclass
from itertools import chain
from threading import Lock
from typing import Generic, Hashable, TypeVar

K = TypeVar("K", bound=Hashable)
V = TypeVar("V")
T = TypeVar("T")


@dataclass
class CacheEvictionState(Generic[K]):
    key: K
    is_deleted: bool = False


@dataclass
class CacheEntry(Generic[K, V]):
    value: V
    eviction_state: CacheEvictionState[K]


class Cache(Generic[K, V]):
    def __init__(self, max_size: int = 256):
        self._cache: dict[K, CacheEntry[K, V]] = {}
        self._eviction_ring = RingBuffer[CacheEvictionState[K]](max_size)
        self._lock = Lock()

    def get(self, key: K) -> V | None:
        with self._lock:
            match self._cache.get(key):
                case None:
                    return None
                case CacheEntry(value, _eviction_state):
                    return value

    def set(self, key: K, value: V) -> None:
        with self._lock:
            self._cache[key] = CacheEntry(value, CacheEvictionState(key))
            match self._eviction_ring.put(self._cache[key].eviction_state):
                case None:
                    pass
                case CacheEvictionState(evicted_key, is_deleted):
                    if not is_deleted:
                        del self._cache[evicted_key]

    def delete(self, key: K) -> None:
        with self._lock:
            if key in self._cache:
                self._cache[key].eviction_state.is_deleted = True
                del self._cache[key]

    def clear(self) -> None:
        self._cache.clear()

    def keys(self) -> list[K]:
        return list(self._cache.keys())

    def values(self) -> list[V]:
        return list(i.value for i in self._cache.values())


class RingBuffer(Generic[T]):
    def __init__(self, max_size: int):
        self._buffer_max_size = max_size + 1
        self._buffer: list[T] = []
        self._read_index: int = 0
        self._write_index: int = 0
        self._lock = Lock()

    def put(self, item: T) -> T | None:
        with self._lock:
            replaced_item: T | None = None
            if (self._write_index + 1) % self._buffer_max_size == self._read_index:
                replaced_item = self._buffer[self._read_index]
                self._read_index = (self._read_index + 1) % self._buffer_max_size

            if len(self._buffer) < self._buffer_max_size:
                self._buffer.append(item)
                self._write_index = (self._write_index + 1) % self._buffer_max_size
                return replaced_item
            else:
                self._buffer[self._write_index] = item
                self._write_index = (self._write_index + 1) % self._buffer_max_size
                return replaced_item

    def get(self) -> T:

        with self._lock:
            if self._read_index == self._write_index:
                raise IndexError("Buffer is empty")

            item = self._buffer[self._read_index]
            self._read_index = (self._read_index + 1) % self._buffer_max_size
            return item

    def __len__(self) -> int:
        with self._lock:
            if self._write_index >= self._read_index:
                return self._write_index - self._read_index
            return self._buffer_max_size - (self._read_index - self._write_index)

    @property
    def is_full(self) -> bool:
        return len(self) == self._buffer_max_size

    def __iter__(self):
        with self._lock:
            if self._read_index == self._write_index:
                return iter([])

            if self._read_index < self._write_index:
                return iter(self._buffer[self._read_index : self._write_index])

            else:  # self._write_index < self._read_index:
                return chain(
                    iter(self._buffer[self._read_index :]),
                    iter(self._buffer[: self._write_index]),
                )
