import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

const App = () => {
  const [booked, setBooked] = useState<number[]>([]);
  const [roomRequest, setRoomRequest] = useState<number>(0);
  const [roomRequestInput, setRoomRequestInput] = useState<string>(''); // Raw input
  const [error, setError] = useState<string>('');

  const [availableRoomNumbers, setAvailableRoomNumbers] = useState<number[]>([]);
  const [previewRooms, setPreviewRooms] = useState<number[]>([]);

  const fetchRooms = async () => {
    const res = await axios.get('http://localhost:4001/api/rooms');
    setAvailableRoomNumbers(res.data.map((r: any) => r.roomNumber));
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    const findBestRooms = (count: number, availableRooms: number[]): number[] => {
      const floorMap: Record<number, number[]> = {};
      availableRooms.forEach((room) => {
        const floor = Math.floor(room / 100);
        if (!floorMap[floor]) floorMap[floor] = [];
        floorMap[floor].push(room);
      });

      for (const floor in floorMap) {
        if (floorMap[floor].length >= count) {
          return floorMap[floor].slice(0, count);
        }
      }

      const combinations = (arr: number[], k: number): number[][] => {
        if (k === 0) return [[]];
        if (arr.length < k) return [];
        return arr.flatMap((val, idx) =>
          combinations(arr.slice(idx + 1), k - 1).map((combo) => [val, ...combo])
        );
      };

      const travelTime = (roomA: number, roomB: number): number => {
        const floorA = Math.floor(roomA / 100);
        const floorB = Math.floor(roomB / 100);
        const posA = roomA % 100;
        const posB = roomB % 100;
        return Math.abs(floorA - floorB) * 2 + Math.abs(posA - posB);
      };

      const allCombos = combinations(availableRooms, count);
      let bestCombo: number[] = [];
      let minTime = Infinity;

      for (const combo of allCombos) {
        const time = combo.reduce((sum, room) => sum + travelTime(combo[0], room), 0);
        if (time < minTime) {
          minTime = time;
          bestCombo = combo;
        }
      }

      return bestCombo;
    };

    if (roomRequest >= 1 && roomRequest <= 5) {
      const preview = findBestRooms(roomRequest, availableRoomNumbers);
      setPreviewRooms(preview);
    } else {
      setPreviewRooms([]);
    }
  }, [roomRequest, availableRoomNumbers]);

  const handleBook = async () => {
    if (roomRequest < 1 || roomRequest > 5) {
      setError('You can only book between 1 and 5 rooms.');
      return;
    }

    try {
      const res = await axios.post('http://localhost:4001/api/book', { count: roomRequest });
      setBooked(res.data.rooms || []);
      setRoomRequest(0);
      setRoomRequestInput('');
      setError('');
      fetchRooms();
    } catch (err) {
      setError('Booking failed. Please try again.');
    }
  };

  const handleReset = async () => {
    await axios.post('http://localhost:4001/api/reset');
    setBooked([]);
    setRoomRequest(0);
    setRoomRequestInput('');
    setError('');
    fetchRooms();
  };

  const handleRandom = async () => {
    await axios.post('http://localhost:4001/api/random');
    setBooked([]);
    setRoomRequest(0);
    setRoomRequestInput('');
    setError('');
    fetchRooms();
  };

  const renderFloor = (floor: number) => {
    const roomCount = floor === 10 ? 7 : 10;
    const floorRooms = Array.from({ length: roomCount }, (_, i) => floor * 100 + i + 1);
    return (
      <div className="floor" key={floor}>
        <div className="floor-label">Floor {floor}</div>
        {floorRooms.map((room) => (
          <div
            key={room}
            className={`room 
              ${!availableRoomNumbers.includes(room) ? 'occupied' : ''} 
              ${booked.includes(room) ? 'booked' : ''} 
              ${previewRooms.includes(room) ? 'preview' : ''}`}
          >
            {room}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="App">
      <h1>Hotel Room Reservation System</h1>

      <div className="controls">
        <input
          type="number"
          placeholder="Rooms"
          value={roomRequestInput}
          onChange={(e) => {
            setRoomRequestInput(e.target.value);
            const value = Number(e.target.value);
            if (!isNaN(value)) {
              setRoomRequest(value);
              setError('');
            }
          }}
          onBlur={() => {
            const value = Number(roomRequestInput);
            if (isNaN(value) || value < 1 || value > 5) {
              setError('Please enter a number between 1 and 5.');
              setRoomRequest(0);
            }
          }}
        />
        <button onClick={handleBook} disabled={roomRequest < 1 || roomRequest > 5}>
          Book
        </button>
        <button onClick={handleReset}>Reset</button>
        <button onClick={handleRandom}>Random</button>
      </div>

      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}

      <div className="hotel">
        {[...Array(10)].map((_, i) => renderFloor(10 - i))}
      </div>
    </div>
  );
};

export default App;