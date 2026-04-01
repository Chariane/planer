import { useEffect } from "react";
import { Provider, useDispatch } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { store } from "@/app/store";
import AppRouter from "@/app/router/AppRouter";
import GlobalErrorBoundary from "@/components/feedback/GlobalErrorBoundary";
import { fetchCurrentUser, logout } from "@/features/auth/model/authSlice";
import { getAccessToken } from "@/utils/helpers/storage";

function AppBootstrap() {
  const dispatch = useDispatch();

  useEffect(() => {
    if (getAccessToken()) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch]);

  useEffect(() => {
    const handler = () => dispatch(logout());
    window.addEventListener("kplaner:logout", handler);

    return () => {
      window.removeEventListener("kplaner:logout", handler);
    };
  }, [dispatch]);

  return <AppRouter />;
}

export default function AppProviders() {
  return (
    <Provider store={store}>
      <GlobalErrorBoundary>
        <AppBootstrap />
        <ToastContainer position="top-right" autoClose={3000} />
      </GlobalErrorBoundary>
    </Provider>
  );
}
