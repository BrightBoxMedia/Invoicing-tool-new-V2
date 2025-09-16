import React from 'react';
import config from '../config';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    const errorId = Date.now().toString();
    
    this.setState({
      error: error,
      errorInfo: errorInfo,
      errorId: errorId
    });

    // Log to console in development
    if (config.IS_DEVELOPMENT) {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }

    // In production, you might want to log to an error reporting service
    if (config.IS_PRODUCTION) {
      // Example: logErrorToService(error, errorInfo, errorId);
      console.error(`Production Error [${errorId}]:`, error.message);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                
                <h2 className="mt-4 text-lg font-medium text-gray-900">
                  Something went wrong
                </h2>
                
                <p className="mt-2 text-sm text-gray-600">
                  We apologize for the inconvenience. The application encountered an unexpected error.
                </p>

                {config.IS_DEVELOPMENT && this.state.error && (
                  <div className="mt-4 p-4 bg-gray-100 rounded-md text-left">
                    <p className="text-xs font-mono text-red-600 break-all">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo.componentStack && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer">
                          Component Stack
                        </summary>
                        <pre className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                {this.state.errorId && (
                  <p className="mt-2 text-xs text-gray-500">
                    Error ID: {this.state.errorId}
                  </p>
                )}

                <div className="mt-6 space-y-2">
                  <button
                    onClick={this.handleReload}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Reload Page
                  </button>
                  
                  <button
                    onClick={this.handleGoHome}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Go to Home
                  </button>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  {config.APP_NAME} v{config.APP_VERSION}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;