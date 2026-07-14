import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { PostLocation } from "./Feed";

const DEFAULT_CENTER: [number, number] = [-14.235, -51.9253];
const DEFAULT_ZOOM = 4;
const SINGLE_POINT_ZOOM = 13;

function createPostMarkerIcon(postId: number) {
  return L.divIcon({
    className: "",
    html: `<span data-post-id="${postId}" style="display:block;width:1.75rem;height:1.75rem;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#50be91;border:2px solid #1e4937;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

type LocatedPost = PostLocation & { latitude: number; longitude: number };

function hasLocation(post: PostLocation): post is LocatedPost {
  return typeof post.latitude === "number" && typeof post.longitude === "number";
}

function FitToPoints({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      const point = points[0];
      if (point) map.setView(point, SINGLE_POINT_ZOOM);
      return;
    }

    map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15 });
  }, [map, points]);

  return null;
}

export default function PostsMapView({
  posts,
  userLocation,
  onSelectPost,
}: {
  posts: PostLocation[];
  userLocation: [number, number] | null;
  onSelectPost?: ((postId: number) => void) | undefined;
}) {
  const located = useMemo(() => posts.filter(hasLocation), [posts]);

  const points = useMemo(() => {
    const locatedPoints = located.map(
      (post): [number, number] => [post.latitude, post.longitude],
    );
    return userLocation ? [...locatedPoints, userLocation] : locatedPoints;
  }, [located, userLocation]);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitToPoints points={points} />

      {located.map((post) => (
        <Marker
          key={post.id}
          position={[post.latitude, post.longitude]}
          icon={createPostMarkerIcon(post.id)}
          eventHandlers={{
            click: () => onSelectPost?.(post.id),
          }}
        >
          <Popup>
            <p className="font-bold">{post.title}</p>
            {post.city && <p className="text-gray-600">{post.city}</p>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
