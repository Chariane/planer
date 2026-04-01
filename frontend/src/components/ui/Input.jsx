import { forwardRef } from "react";

const Input = forwardRef(function Input({ label, error, ...props }, ref) {
  return (
    <label className="input-group">
      {label && <span>{label}</span>}
      <input ref={ref} {...props} />
      {error && <small className="input-error">{error}</small>}
    </label>
  );
});

export default Input;
