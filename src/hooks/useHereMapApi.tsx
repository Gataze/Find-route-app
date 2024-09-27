import H from "@here/maps-api-for-javascript";
import onResize from "simple-element-resize-detector";
import { useEffect, useRef } from "react";
import { useRouteDetails } from "../context/RouteDetailsProvider";

import {
  addRouteShapeToMap,
  addSummaryToContext,
  toMMSS,
} from "../utils/MapUtils";
import { FetchedData } from "../models/fetchModel";
import { CurrentRoute } from "../models/contextModel";

//UseHereMaps custom hook with JavaScript functions and classes provided from "@here/maps-api-for-javascript" library; JavaScript functions were optimized to use with React.
export const useHereMapApi = (data: FetchedData[]) => {
  const { dispatch, setCurrentRoute } = useRouteDetails();
  const refEl = useRef() as React.MutableRefObject<HTMLDivElement>;

  useEffect(() => {
    console.log("Effect here maps");

    // Latitudes and longitudes of selected locations received from HERE Geocoding & Search API
    const {
      items: [
        {
          address: { label: exactStartPlace },
          position: { lat: startLat, lng: startLng },
        },
      ],
    } = data[0];
    const {
      items: [
        {
          address: { label: exactStopPlace },
          position: { lat: stopLat, lng: stopLng },
        },
      ],
    } = data[1];

    //H.service.Platform initializes communication with the platform
    //API key is limited to trusted domains.
    const platform = new H.service.Platform({
      apikey: "iRlqOJYRE5_3AlvbQcOgZbRzQkr358KBNCDYYTFbTOE",
    });

    let layers = platform.createDefaultLayers();

    //Initializes a map
    let map = new H.Map(refEl.current, layers.vector.normal.map, {
      pixelRatio: window.devicePixelRatio,
      padding: { top: 50, left: 50, bottom: 50, right: 50 },
    });

    onResize(refEl.current, () => {
      map?.getViewPort().resize();
    });

    if (map) new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

    //Sends requests to API, receives polyline and travelSummary of current route
    function calculateRouteFromAtoB(platform: H.service.Platform) {
      var router = platform.getRoutingService(undefined, 8),
        routeRequestParams = {
          routingMode: "short",
          transportMode: "truck",
          origin: `${startLat},${startLng}`,
          destination: `${stopLat},${stopLng}`,
          return: "polyline,travelSummary",
        };

      router.calculateRoute(routeRequestParams, onSuccess, onError);
    }

    //AddRouteShapeToMap adds route polyline to map, addSummaryToContext collects route summary details and adds them to context.
    function onSuccess(result: any) {
      var route = result.routes[0];
      addRouteShapeToMap(route, map);

      console.log(route);

      addSummaryToContext(route, data, dispatch);

      const summarizedLength = route?.sections.reduce((acc: any, curr: any) => {
        return acc + curr.travelSummary.length;
      }, 0);

      const summarizedDuration = route?.sections.reduce(
        (acc: any, curr: any) => {
          return acc + curr.travelSummary.duration;
        },
        0
      );

      setCurrentRoute((prevState: CurrentRoute) =>
        prevState
          ? {
              ...prevState,
              exactStartPlace: exactStartPlace,
              exactStopPlace: exactStopPlace,
              distance: summarizedLength / 1000,
              duration: toMMSS(+summarizedDuration),
            }
          : 0
      );
    }

    function onError(error: Error) {
      alert("Can't reach the remote server");
    }

    if (map) calculateRouteFromAtoB(platform);
  }, [data, dispatch, setCurrentRoute]);

  return (
    <>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "480px",
        }}
        ref={refEl}
      />
    </>
  );
};
