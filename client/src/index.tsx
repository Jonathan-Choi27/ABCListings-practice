import { useState, useEffect, useRef } from "react";
import { render } from "react-dom";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import {
  ApolloProvider,
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  useMutation,
  from,
  createHttpLink,
} from "@apollo/client";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Affix, Layout, Spin } from "antd";
import {
  AppHeader,
  Home,
  Host,
  Listing,
  Listings,
  Login,
  NotFound,
  User,
  Stripe,
} from "./sections";
import { AppHeaderSkeleton, ErrorBanner } from "./lib/components";
import { LOG_IN } from "./lib/graphql/mutations";
import {
  LogIn as LogInData,
  LogInVariables,
} from "./lib/graphql/mutations/Login/__generated__/LogIn";
import { Viewer } from "./lib/types";
import "./styles/index.css";
import reportWebVitals from "./reportWebVitals";

const httpLink = createHttpLink({
  uri: "/api",
});

const authRestLink = new ApolloLink((operation, forward) => {
  const token = sessionStorage.getItem("token");
  operation.setContext({
    headers: {
      "X-CSRF-TOKEN": token || "",
    },
  });
  return forward(operation);
}).concat(httpLink);

const client = new ApolloClient({
  uri: "/api",
  link: from([authRestLink]),
  cache: new InMemoryCache(),
});

const initialViewer: Viewer = {
  id: null,
  token: null,
  avatar: null,
  hasWallet: null,
  didRequest: false,
};

const stripePromise = loadStripe(
  process.env.REACT_APP_S_PUBLISHABLE_KEY as string
);

const App = () => {
  const [viewer, setViewer] = useState<Viewer>(initialViewer);
  const [logIn, { error }] = useMutation<LogInData, LogInVariables>(LOG_IN, {
    onCompleted: (data) => {
      if (data && data.logIn) {
        setViewer(data.logIn);

        if (data.logIn.token) {
          sessionStorage.setItem("token", data.logIn.token);
        } else {
          sessionStorage.removeItem("token");
        }
      }
    },
  });
  const logInRef = useRef(logIn);

  useEffect(() => {
    logInRef.current();
  }, []);

  if (!viewer.didRequest && !error) {
    return (
      <Layout className="app-skeleton">
        <AppHeaderSkeleton />
        <div className="app-skeleton__spin-section">
          <Spin size="large" tip="Launching ABCListing" />
        </div>
      </Layout>
    );
  }

  const logInErrorBannerElement = error ? (
    <ErrorBanner description="We weren't able to verify if you were logged in. Please try again later." />
  ) : null;

  return (
    <Router>
      <Layout id="app">
        {logInErrorBannerElement}
        <Affix offsetTop={0} className="app__affix-header">
          <AppHeader viewer={viewer} setViewer={setViewer} />
        </Affix>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/host" element={<Host viewer={viewer} />} />
          <Route
            path="/listing/:id"
            element={
              <Elements stripe={stripePromise}>
                <Listing viewer={viewer} />
              </Elements>
            }
          />
          <Route path="/listings" element={<Listings />}>
            <Route path=":location" element={<Listings />} />
            <Route path="" element={<Listings />} />
          </Route>
          <Route path="/login" element={<Login setViewer={setViewer} />} />
          <Route
            path="/stripe"
            element={<Stripe viewer={viewer} setViewer={setViewer} />}
          />
          <Route
            path="/user/:id"
            element={<User viewer={viewer} setViewer={setViewer} />}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </Router>
  );
};

render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
