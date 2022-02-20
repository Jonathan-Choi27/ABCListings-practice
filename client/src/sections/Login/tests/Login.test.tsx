import { Router } from "react-router-dom";
import { createMemoryHistory } from "history";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";

import { Login } from "../index";
import { AUTH_URL } from "../../../lib/graphql/queries";
import { LOG_IN } from "../../../lib/graphql/mutations";

global.scrollTo = jest.fn();

const defaultProps = {
  setViewer: () => {},
};

describe("Login", () => {
  describe("AUTH_URL Query", () => {
    it("redirects the user when query is successful", async () => {
      Object.defineProperty(window, "location", {
        writable: true,
        value: { assign: jest.fn() },
      });

      const authUrlMock = {
        request: {
          query: AUTH_URL,
        },
        result: {
          data: {
            authUrl: "https://google.com/signin",
          },
        },
      };

      const history = createMemoryHistory({
        initialEntries: ["/login"],
      });
      render(
        <MockedProvider mocks={[authUrlMock]} addTypename={false}>
          <Router navigator={history} location={"/"}>
            <Login {...defaultProps} />
          </Router>
        </MockedProvider>
      );

      const authUrlButton = screen.getByRole("button");
      fireEvent.click(authUrlButton);

      await waitFor(() => {
        expect(window.location.assign).toHaveBeenCalledWith(
          "https://google.com/signin"
        );
      });
      expect(
        screen.queryByText(
          "Sorry, we weren't able to log you in. Please try again later."
        )
      ).toBeNull();
    });

    it("does not redirect the user when query is unsuccessful", async () => {
      Object.defineProperty(window, "location", {
        writable: true,
        value: { assign: jest.fn() },
      });

      const authUrlMock = {
        request: {
          query: AUTH_URL,
        },
        error: new Error("Something went wrong."),
      };

      const history = createMemoryHistory({
        initialEntries: ["/login"],
      });
      render(
        <MockedProvider mocks={[authUrlMock]} addTypename={false}>
          <Router navigator={history} location={"/"}>
            <Login {...defaultProps} />
          </Router>
        </MockedProvider>
      );

      const authUrlButton = screen.getByRole("button");
      fireEvent.click(authUrlButton);

      await waitFor(() => {
        expect(window.location.assign).not.toHaveBeenCalledWith(
          "https://google.com/signin"
        );
      });
      expect(
        screen.getByText(
          "Sorry, we weren't able to log you in. Please try again later."
        )
      ).not.toBeNull();
    });
  });

  describe("LOGIN Mutation", () => {
    it("when no code exists in the /login route, the mutation is not fired", async () => {
      const logInMock = {
        request: {
          query: LOG_IN,
          variables: {
            input: {
              code: "1234",
            },
          },
        },
        result: {
          data: {
            logIn: {
              id: "111",
              token: "4321",
              avatar: "image.png",
              hasWallet: false,
              didRequest: true,
            },
          },
        },
      };

      const history = createMemoryHistory();
      render(
        <MockedProvider mocks={[logInMock]} addTypename={false}>
          <Router navigator={history} location={"/login"}>
            <Login {...defaultProps} />
          </Router>
        </MockedProvider>
      );

      await waitFor(() => {
        expect(history.location.pathname).not.toBe("/user/111");
      });
    });

    describe("code exists in the /login route as a query parameter", () => {
      it("redirects the user to their user page when the mutation is successful", async () => {
        const logInMock = {
          request: {
            query: LOG_IN,
            variables: {
              input: {
                code: "1234",
              },
            },
          },
          result: {
            data: {
              logIn: {
                id: "111",
                token: "4321",
                avatar: "image.png",
                hasWallet: false,
                didRequest: true,
              },
            },
          },
        };

        const history = createMemoryHistory();
        render(
          <MockedProvider mocks={[logInMock]} addTypename={false}>
            <Router navigator={history} location={"/login?code=1234"}>
              <Login {...defaultProps} />
            </Router>
          </MockedProvider>
        );

        await waitFor(() => {
          expect(history.location.pathname).toBe("/user/111");
        });
      });

      it("does not redirect the user to their user page and displays an error message when the mutation is unsuccessful", async () => {
        const logInMock = {
          request: {
            query: LOG_IN,
            variables: {
              input: {
                code: "1234",
              },
            },
          },
          error: new Error("Something went wrong."),
        };

        const history = createMemoryHistory();
        render(
          <MockedProvider mocks={[logInMock]} addTypename={false}>
            <Router navigator={history} location={"/login?code=1234"}>
              <Login {...defaultProps} />
            </Router>
          </MockedProvider>
        );

        await waitFor(() => {
          expect(history.location.pathname).not.toBe("/user/111");
        });
        expect(
          screen.getAllByText(
            "Sorry, we weren't able to log you in. Please try again later."
          )
        ).not.toBeNull();
      });
    });
  });
});
