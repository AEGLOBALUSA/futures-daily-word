import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface DatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  currentDate: Date;
  startDate: Date;
}

export function DatePicker({ isOpen, onClose, onSelectDate, currentDate, startDate }: DatePickerProps) {
  const [displayMonth, setDisplayMonth] = useState(new Date(currentDate));

  if (!isOpen) return null;

  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Create array of dates for the calendar
  const days: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handlePrevMonth = () => {
    setDisplayMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setDisplayMonth(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const selectedDate = new Date(year, month, day);
    if (selectedDate >= startDate && selectedDate <= currentDate) {
      onSelectDate(selectedDate);
      onClose();
    }
  };

  const monthName = displayMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--dw-surface)',
          border: '1px solid var(--dw-border)',
          borderRadius: 12,
          padding: '20px',
          maxWidth: '320px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <button
            onClick={handlePrevMonth}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--dw-text)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Previous month"
          >
            <ChevronLeft size={20} />
          </button>
          <h3
            style={{
              margin: 0,
              color: 'var(--dw-text)',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {monthName}
          </h3>
          <button
            onClick={handleNextMonth}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--dw-text)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Next month"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Weekday headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
            marginBottom: '8px',
          }}
        >
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--dw-text-muted)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
          }}
        >
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} />;
            }

            const dateObj = new Date(year, month, day);
            const isCurrentDate =
              dateObj.getDate() === currentDate.getDate() &&
              dateObj.getMonth() === currentDate.getMonth() &&
              dateObj.getFullYear() === currentDate.getFullYear();
            const isSelectable = dateObj >= startDate && dateObj <= currentDate;

            return (
              <button
                key={day}
                onClick={() => handleSelectDay(day)}
                disabled={!isSelectable}
                style={{
                  padding: '8px',
                  border: isCurrentDate ? '2px solid var(--dw-accent)' : '1px solid var(--dw-border)',
                  borderRadius: '6px',
                  background: isCurrentDate ? 'rgba(200, 146, 14, 0.2)' : 'transparent',
                  color: isSelectable ? 'var(--dw-text)' : 'var(--dw-text-muted)',
                  cursor: isSelectable ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '12px',
                  fontWeight: 500,
                  opacity: isSelectable ? 1 : 0.5,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (isSelectable) {
                    (e.target as HTMLButtonElement).style.background = 'rgba(200, 146, 14, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isCurrentDate) {
                    (e.target as HTMLButtonElement).style.background = 'rgba(200, 146, 14, 0.2)';
                  } else {
                    (e.target as HTMLButtonElement).style.background = 'transparent';
                  }
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
