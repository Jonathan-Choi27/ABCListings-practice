import { Router } from "react-router-dom";
import { createMemoryHistory } from "history";
import { render, waitFor, fireEvent, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/react-testing";

import { LISTINGS } from "../../../lib/graphql/queries";
import { ListingsFilter } from "../../../lib/graphql/globalTypes";
import { Home } from "../index";

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

global.scrollTo = jest.fn();

describe("Home", () => {
  describe("search input", () => {
    it("renders an empty search input on initial render", async () => {
      const history = createMemoryHistory();
      render(
        <MockedProvider mocks={[]}>
          <Router navigator={history} location={"/"}>
            <Home />
          </Router>
        </MockedProvider>
      );

      const searchInput = screen.getByPlaceholderText(
        "Search 'Toronto'"
      ) as HTMLInputElement;

      await waitFor(() => {
        expect(searchInput.value).toEqual("");
      });
    });

    it("redirects the user to the /listings page when a valid search is provided", async () => {
      const history = createMemoryHistory();
      render(
        <MockedProvider mocks={[]}>
          <Router navigator={history} location={"/"}>
            <Home />
          </Router>
        </MockedProvider>
      );

      const searchInput = screen.getByPlaceholderText(
        "Search 'Toronto'"
      ) as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: "Toronto" } });
      fireEvent.keyDown(searchInput, { key: "Enter", keyCode: 13 });

      await waitFor(() => {
        expect(history.location.pathname).toBe("/listings/Toronto");
      });
    });

    it("does not redirect the user to the /listings page when a invalid search is provided", async () => {
      const history = createMemoryHistory();
      render(
        <MockedProvider mocks={[]}>
          <Router navigator={history} location={"/"}>
            <Home />
          </Router>
        </MockedProvider>
      );

      const searchInput = screen.getByPlaceholderText(
        "Search 'Toronto'"
      ) as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: "" } });
      fireEvent.keyDown(searchInput, { key: "Enter", keyCode: 13 });

      await waitFor(() => {
        expect(history.location.pathname).toBe("/");
      });
    });
  });

  describe("premium listings", () => {
    it("renders the loading state when the query is loading", async () => {
      const history = createMemoryHistory();
      render(
        <MockedProvider mocks={[]}>
          <Router navigator={history} location={"/"}>
            <Home />
          </Router>
        </MockedProvider>
      );

      expect(
        await screen.findByText("Premium Listings - Loading")
      ).not.toBeNull();
      expect(screen.queryByText("Premium Listings")).toBeNull();
    });

    it("renders the intended UI when the query is successful", async () => {
      const listingsMock = {
        request: {
          query: LISTINGS,
          variables: {
            filter: ListingsFilter.PRICE_HIGH_TO_LOW,
            limit: 4,
            page: 1,
          },
        },
        result: {
          data: {
            listings: {
              region: null,
              total: 10,
              result: [
                {
                  id: "1234",
                  title: "title",
                  image: "image.png",
                  address: "11 Address",
                  price: 1000,
                  numOfGuests: 10,
                },
              ],
            },
          },
        },
      };

      const history = createMemoryHistory();
      render(
        <MockedProvider mocks={[listingsMock]} addTypename={false}>
          <Router navigator={history} location={"/"}>
            <Home />
          </Router>
        </MockedProvider>
      );

      expect(await screen.findByText("Premium Listings")).not.toBeNull();
      expect(screen.queryByText("Premium Listings - Loading")).toBeNull();
    });

    it("does not render the loading section or the listings section when query has an error", async () => {
      const listingsMock = {
        request: {
          query: LISTINGS,
          variables: {
            filter: ListingsFilter.PRICE_HIGH_TO_LOW,
            limit: 4,
            page: 1,
          },
        },
        error: new Error("Network Error"),
      };

      const history = createMemoryHistory();
      render(
        <MockedProvider mocks={[listingsMock]} addTypename={false}>
          <Router navigator={history} location={"/"}>
            <Home />
          </Router>
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText("Premium Listings")).toBeNull();
      });
      expect(screen.queryByText("Premium Listings - Loading")).toBeNull();
    });
  });
});
