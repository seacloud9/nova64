import { useUIStore } from '../os/stores';

export function AlertModal() {
  const { alerts, dismissAlert } = useUIStore();

  if (alerts.length === 0) {
    return null;
  }

  const alert = alerts[0]; // Show first alert

  const handleButtonClick = (button: string) => {
    dismissAlert(alert.id, button);
  };

  const getIcon = () => {
    switch (alert.options.icon) {
      case 'warning':
        return '⚠️';
      case 'error':
        return '🛑';
      case 'question':
        return '❓';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="modal-overlay">
      <div className="alert-dialog">
        <div className="alert-content">
          <div className="alert-icon">{getIcon()}</div>
          <div className="alert-text">
            <div className="alert-title">{alert.options.title}</div>
            <div className="alert-message">{alert.options.message}</div>
          </div>
        </div>
        <div className="alert-buttons">
          {alert.options.buttons.map((button, index) => (
            <button
              key={index}
              className={`button ${index === 0 ? 'default' : ''}`}
              onClick={() => handleButtonClick(button)}
            >
              {button}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
