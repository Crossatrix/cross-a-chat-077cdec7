import React, { Component, ErrorInfo, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCode: string;
  countdown: number;
  isSending: boolean;
  sent: boolean;
}

// Track crashes in memory for auto-maintenance trigger
const CRASH_STORAGE_KEY = 'app_crash_timestamps';

function recordCrash(): number {
  try {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const stored = JSON.parse(localStorage.getItem(CRASH_STORAGE_KEY) || '[]') as number[];
    const recent = stored.filter(t => t > oneHourAgo);
    recent.push(now);
    localStorage.setItem(CRASH_STORAGE_KEY, JSON.stringify(recent));
    return recent.length;
  } catch {
    return 0;
  }
}

async function triggerMaintenanceMode() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from('app_settings')
      .update({ value: 'true', updated_at: new Date().toISOString(), updated_by: user?.id || null })
      .eq('key', 'maintenance_mode');

    await supabase
      .from('app_settings')
      .update({ value: until, updated_at: new Date().toISOString(), updated_by: user?.id || null })
      .eq('key', 'maintenance_until');

    // Send crash report as feedback to admins
    if (user) {
      await supabase.from('feedback').insert({
        user_id: user.id,
        message: `⚠️ AUTO-MAINTENANCE TRIGGERED: The app crashed 50+ times in the last hour. Maintenance mode has been enabled automatically for 24 hours. Please investigate the errors in the admin panel.`,
        important: true,
      });
    }
  } catch (e) {
    console.error('Failed to trigger maintenance mode:', e);
  }
}

class ErrorBoundary extends Component<Props, State> {
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private globalErrorHandler: ((event: ErrorEvent) => void) | null = null;
  private unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCode: this.generateErrorCode(),
      countdown: 15,
      isSending: false,
      sent: false,
    };
  }

  componentDidMount() {
    this.globalErrorHandler = (event: ErrorEvent) => {
      event.preventDefault();
      this.handleGlobalError(event.error || new Error(event.message), 'window.onerror');
    };

    this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      this.handleGlobalError(error, 'unhandledrejection');
    };

    window.addEventListener('error', this.globalErrorHandler);
    window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
  }

  private isExtensionError(error: Error): boolean {
    const msg = error.message?.toLowerCase() || '';
    const stack = error.stack?.toLowerCase() || '';
    const extensionPatterns = [
      'extension', 'chrome-extension', 'moz-extension', 'safari-extension',
      'failed to execute', 'removeChild', 'insertBefore', 'appendChild',
      'not a child of this node', 'the node to be removed is not a child',
      'hydrat', 'script error', 'ResizeObserver loop',
    ];
    return extensionPatterns.some(p => msg.includes(p) || stack.includes(p));
  }

  private async handleGlobalError(error: Error, source: string) {
    if (this.state.hasError) return;
    if (this.isExtensionError(error)) {
      console.warn('[ErrorBoundary] Suppressed likely extension/DOM error:', error.message);
      return;
    }

    // Record crash and check threshold
    const crashCount = recordCrash();
    if (crashCount >= 50) {
      triggerMaintenanceMode();
    }

    const errorCode = this.generateErrorCode();
    this.setState({ 
      hasError: true, 
      error, 
      errorCode,
      isSending: true 
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('errors').insert({
        user_id: user?.id || null,
        error_message: error.message,
        error_stack: error.stack || null,
        component_stack: null,
        url: window.location.href,
        user_agent: navigator.userAgent,
        additional_info: {
          errorCode,
          timestamp: new Date().toISOString(),
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          source,
          crashCount,
        },
      });

      this.setState({ sent: true });
    } catch (sendError) {
      console.error('Failed to send error report:', sendError);
    } finally {
      this.setState({ isSending: false });
    }

    this.startCountdown();
  }

  private generateErrorCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private startCountdown() {
    if (this.countdownInterval) return;
    
    this.countdownInterval = setInterval(() => {
      this.setState((prevState) => {
        if (prevState.countdown <= 1) {
          if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
          }
          window.location.href = '/auth';
          return { ...prevState };
        }
        return { ...prevState, countdown: prevState.countdown - 1 };
      });
    }, 1000);
  }

  static getDerivedStateFromError(error: Error): Partial<State> | null {
    const msg = error.message?.toLowerCase() || '';
    const stack = error.stack?.toLowerCase() || '';
    const extensionPatterns = [
      'extension', 'chrome-extension', 'moz-extension', 'safari-extension',
      'failed to execute', 'removeChild', 'insertBefore', 'appendChild',
      'not a child of this node', 'the node to be removed is not a child',
      'hydrat', 'script error', 'ResizeObserver loop',
    ];
    if (extensionPatterns.some(p => msg.includes(p) || stack.includes(p))) {
      return null;
    }
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.state.isSending || this.state.sent) return;
    
    // Record crash and check threshold
    const crashCount = recordCrash();
    if (crashCount >= 50) {
      triggerMaintenanceMode();
    }

    this.setState({ errorInfo, isSending: true });

    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('errors').insert({
        user_id: user?.id || null,
        error_message: error.message,
        error_stack: error.stack || null,
        component_stack: errorInfo.componentStack || null,
        url: window.location.href,
        user_agent: navigator.userAgent,
        additional_info: {
          errorCode: this.state.errorCode,
          timestamp: new Date().toISOString(),
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          source: 'componentDidCatch',
          crashCount,
        },
      });

      this.setState({ sent: true });
    } catch (sendError) {
      console.error('Failed to send error report:', sendError);
    } finally {
      this.setState({ isSending: false });
    }

    this.startCountdown();
  }

  componentWillUnmount() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    if (this.globalErrorHandler) {
      window.removeEventListener('error', this.globalErrorHandler);
    }
    if (this.unhandledRejectionHandler) {
      window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
    }
  }
  private openGitHubIssue = () => {
    const { error, errorInfo, errorCode } = this.state;
    const title = encodeURIComponent(`[Error] ${errorCode}: ${error?.message || 'Unknown error'}`);
    const stack = error?.stack || errorInfo?.componentStack || 'No stack trace available';
    const body = encodeURIComponent(
      `**Error Code:** ${errorCode}\n\n` +
      `**Message:** ${error?.message || 'Unknown error'}\n\n` +
      `**Stack Trace:**\n\`\`\`\n${stack}\n\`\`\`\n\n` +
      `**URL:** ${window.location.href}\n` +
      `**User Agent:** ${navigator.userAgent}\n` +
      `**Screen Size:** ${window.innerWidth}x${window.innerHeight}\n`
    );
    const url = `https://github.com/Crossatrix/cross-a-chat/issues/new?title=${title}&body=${body}`;
    window.open(url, '_blank', 'noopener');
  };
  render() {
    if (this.state.hasError) {
      const { error, errorCode, countdown, isSending, sent } = this.state;
      const progressPercentage = ((15 - countdown) / 15) * 100;

      return (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-8 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0078D4 0%, #005A9E 100%)',
            fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          <div className="text-white text-[120px] sm:text-[180px] font-light mb-4 animate-pulse">
            :(
          </div>

          <h1 className="text-white text-lg sm:text-2xl font-light text-center max-w-2xl mb-6 leading-relaxed">
            Your app ran into a problem and needs to restart. We're collecting some error info, and then we'll redirect you to the login page.
          </h1>

          <div className="w-full max-w-md mb-6">
            <div className="h-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-white/80 text-sm mt-2 text-center">
              {progressPercentage.toFixed(0)}% complete
            </p>
          </div>

          <div className="text-white/90 text-sm sm:text-base text-center space-y-1 mb-8">
            {isSending && (
              <p className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Sending error report to administrators...
              </p>
            )}
            {sent && (
              <p className="text-green-300">✓ Error report sent successfully</p>
            )}
            <p>Redirecting in {countdown} seconds...</p>
          </div>

          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 sm:p-6 max-w-2xl w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-white/80 text-xs sm:text-sm font-mono">
              <div>
                <span className="text-white/50">Error Code:</span>
                <span className="ml-2 text-white">{errorCode}</span>
              </div>
              <div>
                <span className="text-white/50">Stop Code:</span>
                <span className="ml-2 text-white">CRITICAL_APP_ERROR</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-white/50">What failed:</span>
                <span className="ml-2 text-white break-all">
                  {error?.message || 'Unknown error'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 text-white/70 text-xs sm:text-sm">
            <div className="w-16 h-16 bg-white/10 rounded flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-white/40" fill="currentColor">
                <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v3h-3v-3zm-3 3h3v3h-3v-3zm3 3h3v3h-3v-3zm-3 3h3v3h-3v-3zm3 0h3v3h-3v-3z"/>
              </svg>
            </div>
            <div className="text-center sm:text-left">
              <p>For more information about this issue and possible fixes,</p>
              <p>contact your administrator with error code: <strong className="text-white">{errorCode}</strong></p>
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/auth'}
            className="mt-8 px-6 py-2 text-white/80 hover:text-white border border-white/30 hover:border-white/60 rounded transition-colors text-sm"
          >
            Skip and go to login now
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
