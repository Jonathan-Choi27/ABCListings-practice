import { useEffect, useRef } from "react";
import { Card, Layout, Spin, Typography } from "antd";
import { Navigate, useLocation } from "react-router-dom";
import { useApolloClient, useMutation } from "@apollo/client";

import { ErrorBanner } from "../../lib/components";
import { LOG_IN } from "../../lib/graphql/mutations";
import { AUTH_URL } from "../../lib/graphql/queries";
import {
  LogIn as LogInData,
  LogInVariables,
} from "../../lib/graphql/mutations/Login/__generated__/LogIn";
import { AuthUrl as AuthUrlData } from "../../lib/graphql/queries/AuthUrl/__generated__/AuthUrl";
import {
  displaySuccessNotification,
  displayErrorMessage,
} from "../../lib/utils";
import { Viewer } from "../../lib/types";
import { useScrollToTop } from "../../lib/hooks";

import GoogleLogo from "./assets/google_logo.jpg";

interface Props {
  setViewer: (viewer: Viewer) => void;
}

const { Content } = Layout;
const { Text, Title } = Typography;

export const Login = ({ setViewer }: Props) => {
  const client = useApolloClient();
  const location = useLocation();
  const [logIn, { data: logInData, loading: logInLoading, error: logInError }] =
    useMutation<LogInData, LogInVariables>(LOG_IN, {
      onCompleted: (data) => {
        if (data && data.logIn && data.logIn.token) {
          setViewer(data.logIn);
          sessionStorage.setItem("token", data.logIn.token);
          displaySuccessNotification("You've successfully logged in.");
        }
      },
      onError: () => {}, // Test error state of component
    });
  const logInRef = useRef(logIn);

  useScrollToTop();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get("code");

    if (code) {
      logInRef.current({
        variables: {
          input: { code },
        },
      });
    }
  }, [location.search]);

  const handleAuthorize = async () => {
    try {
      const { data } = await client.query<AuthUrlData>({
        query: AUTH_URL,
      });
      if (!data) throw new Error("Unable to authenticate.");

      window.location.assign(data.authUrl);
    } catch (error) {
      displayErrorMessage(
        "Sorry, we weren't able to log you in. Please try again later."
      );
    }
  };

  if (logInLoading)
    return (
      <Content className="log-in">
        <Spin size="large" tip="Logging in..." />
      </Content>
    );

  if (logInData && logInData.logIn) {
    const { id: viewerId } = logInData.logIn;
    return <Navigate to={`/user/${viewerId}`} />;
  }

  const logInErrorBannerElement = logInError ? (
    <ErrorBanner description="Sorry, we weren't able to log you in. Please try again later." />
  ) : null;

  return (
    <Content className="log-in">
      {logInErrorBannerElement}
      <Card className="log-in-card">
        <div className="log-in-card__intro">
          <Title level={3} className="log-in-card__intro-title">
            <span role="img" aria-label="wave">
              ✨
            </span>
          </Title>
          <Title level={3} className="log-in-card__intro-title">
            Welcome to ABCListing
          </Title>
          <Text>Sign in with Google to get started!</Text>
          <button
            className="log-in-card__google-button"
            onClick={handleAuthorize}
          >
            <img
              src={GoogleLogo}
              alt="Google Logo"
              className="log-in-card__google-button-logo"
            />
            <span className="log-in-card__google-button-text">
              Sign in with Google
            </span>
          </button>
          <Text type="secondary">
            Note: You'll be redirected to the Google consent form to sign in
            with your Google account.
          </Text>
        </div>
      </Card>
    </Content>
  );
};
