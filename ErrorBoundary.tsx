import React from 'react';

const ErrorBoundary = ({ error, resetErrorBoundary }) => {
  return (
    <div>
      <h1>Something went wrong.</h1>
      <p>Error code: {error.code}</p>
      <p>{error.message}</p>
      <pre>{error.stack}</pre>
      <button onClick={resetErrorBoundary}>Skip and go to login now</button>
      {/* New button to report error on GitHub */}
      <button
        onClick={() => {
          const title = encodeURIComponent(`Error Report: ${error.message}`);
          const body = encodeURIComponent(`Error Code: ${error.code}\n\nMessage: ${error.message}\n\nStack Trace: ${error.stack}`);
          const url = `https://github.com/Crossatrix/cross-a-chat/issues/new?title=${title}&body=${body}`;
          window.open(url, '_blank');
        }}
      >
        Report this error on GitHub
      </button>
    </div>
  );
};

export default ErrorBoundary;