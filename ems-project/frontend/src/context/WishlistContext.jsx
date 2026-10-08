import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext({ ids: new Set(), events: [], toggle: async () => {}, has: () => false });

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(new Set());
  const [events, setEvents] = useState([]);

  const apply = (d) => { setIds(new Set(d.ids)); setEvents(d.events); };

  useEffect(() => {
    if (!user) { setIds(new Set()); setEvents([]); return; }
    api.get("/wishlist").then((r) => apply(r.data)).catch(() => {});
  }, [user]);

  const has = useCallback((id) => ids.has(id), [ids]);

  const toggle = useCallback(async (id) => {
    const res = ids.has(id) ? await api.delete(`/wishlist/${id}`) : await api.post(`/wishlist/${id}`);
    apply(res.data);
  }, [ids]);

  return <WishlistContext.Provider value={{ ids, events, has, toggle }}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
