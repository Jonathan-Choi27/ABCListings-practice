import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Input, Layout } from "antd";

import { MenuItems } from "./components";
import logo from "./assets/abclisting-logo.png";
import { Viewer } from "../../lib/types";
import { displayErrorMessage } from "../../lib/utils";

interface Props {
  viewer: Viewer;
  setViewer: (viewer: Viewer) => void;
}

const { Header } = Layout;
const { Search } = Input;

export const AppHeader = ({ viewer, setViewer }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const { pathname } = location;
    const pathnameSubStrings = pathname.split("/");
    if (!pathname.includes("/listings")) {
      setSearch("");
      return;
    }

    if (pathname.includes("/listings") && pathnameSubStrings.length === 3) {
      setSearch(pathnameSubStrings[2]);
      return;
    }
  }, [location]);

  const onSearch = (value: string) => {
    const trimmedValue = value.trim();
    return trimmedValue
      ? navigate(`/listings/${trimmedValue}`)
      : displayErrorMessage("Please enter a valid search.");
  };

  return (
    <Header className="app-header">
      <div className="app-header__logo-search-section">
        <div className="app-header__logo">
          <Link to="/">
            <img src={logo} alt="ABC Listing Logo" />
          </Link>
        </div>
      </div>
      <div className="app-header__search-input">
        <Search
          placeholder="Search 'Toronto'"
          enterButton
          value={search}
          onChange={(evt) => setSearch(evt.target.value)}
          onSearch={onSearch}
        />
      </div>
      <div className="app-header__menu-section">
        <MenuItems viewer={viewer} setViewer={setViewer} />
      </div>
    </Header>
  );
};
