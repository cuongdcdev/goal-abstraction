import { useState, useEffect } from 'react';

const DateInput = ({ setDeadlineProp, defaultDeadline }) => {
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0 });
    const [isDeadlinePassed, setIsDeadlinePassed] = useState(false);

    useEffect(() => {
        const defaultDate = new Date(defaultDeadline / 1000000);
        setSelectedDate(defaultDate.toISOString().split('T')[0]);
        setSelectedTime(defaultDate.toTimeString().split(' ')[0].slice(0, 5));
    }, [defaultDeadline]);

    useEffect(() => {
        if (selectedDate && selectedTime) {
            const updateTimeRemaining = () => {
                const deadline = new Date(`${selectedDate}T${selectedTime}`);
                const now = new Date();
                const diffTime = deadline - now;
                
                const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.ceil((diffTime % (1000 * 60 * 60)) / (1000 * 60));
                
                setTimeRemaining({ days, hours, minutes });
                setIsDeadlinePassed(diffTime <= 0);
            };

            updateTimeRemaining();
            const interval = setInterval(updateTimeRemaining, 1000);
            
            return () => clearInterval(interval);
        }
    }, [selectedDate, selectedTime]);

    const handleSubmit = () => {
        const deadline = new Date(`${selectedDate}T${selectedTime}`);
        setDeadlineProp(deadline.getTime() * 1000000); // Convert to nanoseconds
    };

    return (
        <div className="container py-5">
            <div className="card shadow-sm">
                <div className="card-body p-4">
                    <h2 className="card-title text-center mb-4">When's Your Deadline?</h2>

                    <div className="mb-4">

                        <div className="input-container p-4 bg-light rounded border border-primary">
                            <div className="mb-3">
                                <label className="form-label h5 mb-3">Select Date</label>
                                <input
                                    type="date"
                                    className="form-control form-control-lg shadow-sm"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            <div>
                                <label className="form-label h5 mb-3">Select Time</label>
                                <input
                                    type="time"
                                    className="form-control form-control-lg shadow-sm"
                                    value={selectedTime}
                                    onChange={(e) => setSelectedTime(e.target.value)}
                                />
                            </div>
                        </div>

                        {selectedDate && selectedTime && isDeadlinePassed ? (
                            <div className="alert alert-danger mt-3" role="alert">
                                <i className="bi bi-exclamation-triangle me-2"></i>
                                The deadline you selected has already passed. Please choose a future date and time.
                            </div>
                        ) : (
                            selectedDate && selectedTime && timeRemaining.days >= 0 && (
                                <div className="text-center text-muted small mt-3">
                                    <i className="bi bi-calendar-check me-2"></i>
                                    {timeRemaining.days} days, {timeRemaining.hours} hours, {timeRemaining.minutes} minutes remaining until the deadline
                                </div>
                            )
                        )}
                    </div>

                    <div className="text-center">
                        <button
                            className="btn btn-primary btn-lg"
                            disabled={!selectedDate || !selectedTime || isDeadlinePassed}
                            onClick={handleSubmit}
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DateInput;
