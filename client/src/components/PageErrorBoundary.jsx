import { Component } from 'react';
import { ErrorPanel } from './ErrorPanel.jsx';

// Keeps a crash in one page from taking the whole app with it: the sidebar and header stay, the
// content area shows a recovery panel. It clears itself when the route changes (`resetKey`), so
// navigating elsewhere works without a reload. Lazy-load failures are caught here too.
export class PageErrorBoundary extends Component {
  state = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) return <ErrorPanel error={this.state.error} homeTo={this.props.homeTo} />;
    return this.props.children;
  }
}
