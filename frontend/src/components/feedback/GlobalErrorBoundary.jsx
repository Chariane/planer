import React from "react";
import { toast } from "react-toastify";

export default class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error(error);
    toast.error("Une erreur inattendue est survenue.");
  }

  render() {
    if (this.state.hasError) {
      return <div className="feedback feedback-error">Erreur application.</div>;
    }

    return this.props.children;
  }
}
