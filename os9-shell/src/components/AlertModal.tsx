import { useEffect } from 'react';
import { useUIStore } from '../os/stores';
import { UISounds } from '../os/sounds';

export function AlertModal() {
  const { alerts, dismissAlert } = useUIStore();

  const alert = alerts.length > 0 ? alerts[0] : null;

  useEffect(() => {
    if (alert) {
      if (alert.options.icon === 'error' || alert.options.icon === 'warning') {
        UISounds.error();
      } else {
        UISounds.alert();
      }
    }
  }, [alert?.id]);

  if (!alert) {
    return null;
  }

  const handleButtonClick = (button: string) => {
    UISounds.click();
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
