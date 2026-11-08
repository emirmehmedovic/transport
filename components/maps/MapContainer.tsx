"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Map as LeafletMap } from "leaflet";
import { createLeafletContext, LeafletProvider } from "@react-leaflet/core";
import type { MapContainerProps } from "react-leaflet";

/** Own each map for one effect lifetime, including Strict Mode/Fast Refresh replay.
 * A fresh inner node prevents a delayed cleanup from touching a replacement map.
 * Like React Leaflet's MapContainer, initial map options are immutable.
 */
export const MapContainer = forwardRef<LeafletMap, MapContainerProps>(function MapContainer(
  { children, placeholder, className, id, style, ...options },
  forwardedRef
) {
  const host = useRef<HTMLDivElement>(null);
  const initialOptions = useRef(options);
  const [context, setContext] = useState<ReturnType<typeof createLeafletContext> | null>(null);
  useImperativeHandle(forwardedRef, () => context?.map as LeafletMap, [context]);

  useEffect(() => {
    const element = document.createElement("div");
    element.style.height = "100%";
    element.style.width = "100%";
    host.current!.appendChild(element);
    const { bounds, boundsOptions, center, zoom, whenReady, ...mapOptions } = initialOptions.current;
    const map = new LeafletMap(element, mapOptions);
    try {
      if (center != null && zoom != null) map.setView(center, zoom);
      else if (bounds != null) map.fitBounds(bounds, boundsOptions);
      if (whenReady) map.whenReady(whenReady);
      setContext(createLeafletContext(map));
    } catch (error) {
      map.remove();
      element.remove();
      throw error;
    }
    return () => {
      map.remove();
      element.remove();
    };
  }, []);

  return (
    <div className={className} id={id} style={style}>
      <div ref={host} style={{ height: "100%", width: "100%" }} />
      {context ? <LeafletProvider value={context}>{children}</LeafletProvider> : placeholder ?? null}
    </div>
  );
});
