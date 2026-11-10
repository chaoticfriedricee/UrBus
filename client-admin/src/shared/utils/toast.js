import toast from 'react-hot-toast';

const baseStyle = {
  borderRadius: '10px',
  fontWeight: 600,
  fontFamily: 'inherit',
  fontSize: '0.95rem',
  padding: '12px 16px',
  color: '#1d2733',
  boxShadow: '3px 3px 0 #1d2733',
};

export const showSuccess = (message) => {
  toast.success(message, {
    style: { ...baseStyle, background: '#dcefe3', border: '1.5px solid #1d2733' },
    iconTheme: { primary: '#2c7a4f', secondary: '#fff' },
  });
};

export const showError = (message) => {
  toast.error(message, {
    style: { ...baseStyle, background: '#fadfda', border: '1.5px solid #1d2733' },
    iconTheme: { primary: '#b83a2d', secondary: '#fff' },
  });
};

export const showInfo = (message) => {
  toast(message, {
    style: { ...baseStyle, background: '#e0ecf5', border: '1.5px solid #1d2733' },
    iconTheme: { primary: '#005691', secondary: '#fff' },
  });
};
