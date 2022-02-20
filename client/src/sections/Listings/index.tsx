import { useState, useRef, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { Affix, Layout, List, Typography } from "antd";

import { ErrorBanner, ListingCard } from "../../lib/components";
import { ListingsFilter } from "../../lib/graphql/globalTypes";
import { LISTINGS } from "../../lib/graphql/queries";
import {
  Listings as ListingsData,
  ListingsVariables,
} from "../../lib/graphql/queries/Listings/__generated__/Listings";
import {
  ListingsFilters,
  ListingsPagination,
  ListingsSkeleton,
} from "./components";
import { useScrollToTop } from "../../lib/hooks";

const { Content } = Layout;
const { Text, Title, Paragraph } = Typography;

const PAGE_LIMIT = 8;

export const Listings = () => {
  const params = useParams();
  const locationRef = useRef(params.location);
  const [filter, setFilter] = useState(ListingsFilter.PRICE_LOW_TO_HIGH);
  const [page, setPage] = useState(1);
  const { loading, data, error } = useQuery<ListingsData, ListingsVariables>(
    LISTINGS,
    {
      skip: locationRef.current !== params.location && page !== 1,
      variables: {
        location: params.location,
        filter,
        limit: PAGE_LIMIT,
        page,
      },
    }
  );

  useScrollToTop();

  useEffect(() => {
    setPage(1);
    locationRef.current = params.location;
  }, [params.location]);

  if (loading)
    return (
      <Content className="listings">
        <ListingsSkeleton />
      </Content>
    );

  if (error)
    return (
      <Content className="listings">
        <ErrorBanner description="We couldn't find anything matching your search or have encountered an error. If you're searching for a unique location, try searching again with more common keywords." />
        <ListingsSkeleton />
      </Content>
    );

  const listings = data ? data.listings : null;
  const listingsRegion = listings ? listings.region : null;

  const listingsSectionElement =
    listings && listings.result.length ? (
      <div>
        <Affix offsetTop={64}>
          <ListingsPagination
            total={listings.total}
            page={page}
            limit={PAGE_LIMIT}
            setPage={setPage}
          />
          <ListingsFilters filter={filter} setFilter={setFilter} />
        </Affix>
        <List
          grid={{
            gutter: 8,
            xs: 1,
            sm: 2,
            lg: 4,
          }}
          dataSource={listings.result}
          renderItem={(listing) => (
            <List.Item>
              <ListingCard listing={listing} />
            </List.Item>
          )}
        />
      </div>
    ) : (
      <div>
        <Paragraph>
          There are no listings created for{" "}
          <Text mark strong>
            "{listingsRegion}"
          </Text>
        </Paragraph>
        <Paragraph>
          Be the first person to create a <Link to="/host">listing</Link> in
          this area.
        </Paragraph>
      </div>
    );

  const listingsRegionElement = listingsRegion ? (
    <Title level={3} className="listings__title">
      Results for "{listingsRegion}"
    </Title>
  ) : null;

  return (
    <Content className="listings">
      {listingsRegionElement}
      {listingsSectionElement}
    </Content>
  );
};
