using System;

namespace Jamrah.Services
{
    public sealed class PomodoroTimer : IDisposable
    {
        private TimeSpan _duration;
        private System.Threading.Timer? _timer;

        public PomodoroTimer(TimeSpan duration)
        {
            _duration = duration;
            Remaining = duration;
        }

        public TimeSpan Remaining { get; private set; }
        public bool IsRunning { get; private set; }
        public bool IsCompleted => Remaining == TimeSpan.Zero;

        public event Action? Tick;
        public event Action? Completed;

        public void Start()
        {
            if (IsRunning || IsCompleted) return;
            IsRunning = true;
            _timer = new System.Threading.Timer(_ => TickOnce(), null, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(1));
        }

        public void Pause()
        {
            if (!IsRunning) return;
            IsRunning = false;
            _timer?.Dispose();
            _timer = null;
        }

        public void Reset()
        {
            Pause();
            Remaining = _duration;
        }

        public void SetDuration(TimeSpan duration)
        {
            Pause();
            _duration = duration;
            Remaining = duration;
        }

        public void AdjustDuration(TimeSpan delta)
        {
            if (delta == TimeSpan.Zero) return;
            var newDuration = _duration + delta;
            if (newDuration < TimeSpan.FromMinutes(1)) return;
            var newRemaining = Remaining + delta;
            if (newRemaining < TimeSpan.Zero) newRemaining = TimeSpan.Zero;
            if (newRemaining > newDuration) newRemaining = newDuration;
            _duration = newDuration;
            Remaining = newRemaining;
        }

        public void TickOnce()
        {
            if (Remaining.TotalSeconds > 1)
            {
                Remaining = Remaining.Subtract(TimeSpan.FromSeconds(1));
                Tick?.Invoke();
                return;
            }

            Remaining = TimeSpan.Zero;
            Pause();
            Completed?.Invoke();
        }

        public void Dispose() => Pause();
    }
}