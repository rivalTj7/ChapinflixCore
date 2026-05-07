# Next.js Video Streaming Frontend - File Structure

## 1. app/layout.tsx
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Video Streaming Service",
  description: "Personal streaming platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

## 2. app/page.tsx
```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "navigation";
import { useAuth } from "./components/AuthProvider";

export default function Home() {
  const router = useRouter();
  const { token, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (token) {
        router.push("/catalog");
      } else {
        router.push("/login");
      }
    }
  }, [token, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Loading...</p>
    </div>
  );
}
```

## 3. app/components/AuthProvider.tsx
```tsx
"use client";
import { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  setToken: () => {},
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = Cookies.get("access_token");
    if (savedToken) {
      setTokenState(savedToken);
    }
    setLoading(false);
  }, []);

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      Cookies.set("access_token", newToken);
    } else {
      Cookies.remove("access_token");
    }
  };

  return (
    <AuthContext.Provider value={{ token, setToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## 4. app/login/page.tsx
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";

export default function Login() {
  const router = useRouter();
  const { setToken } = useAuth();
  const [username, setUsername] = useState("beto");
  const [password, setPassword] = useState("beto2025");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://34.10.139.168.nip.io/auth/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.detail || "Login failed");
        return;
      }

      setToken(data.access_token);
      router.push("/catalog");
    } catch (err) {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-white">Login</h1>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded"
              required
            />
          </div>

          {message && (
            <p className={`mb-4 ${message.includes("success") ? "text-green-500" : "text-yellow-500"}`}>
              {message}
            </p>
          )}

          <button 
            type="submit"
            disabled={uploading}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-600"
          >
            {uploading ? "Uploading..." : "Upload Movie"}
          </button>
        </form>
      </div>
    </div>
  );
} p-2 rounded bg-gray-700 text-white"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 text-white"
              required
            />
          </div>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-600"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

## 5. app/catalog/page.tsx
```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import Link from "next/link";

interface Movie {
  movie_id: number;
  title: string;
  slug: string;
  is_free: boolean;
  duration_minutes: number;
  view_count: number;
  upload_date: string;
}

interface Category {
  category_id: number;
  name: string;
  slug: string;
}

export default function Catalog() {
  const router = useRouter();
  const { token } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("popular");

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadCategories();
    loadMovies("popular");
  }, [token]);

  const loadCategories = async () => {
    try {
      const res = await fetch("http://34.10.139.168.nip.io/vercatalogo/catalog/categories");
      const data = await res.json();
      setCategories(data || []);
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  const loadMovies = async (type: string) => {
    setLoading(true);
    setActiveTab(type);
    let url = "http://34.10.139.168.nip.io/vercatalogo/catalog/";
    
    switch (type) {
      case "popular":
        url += "most-popular?limit=20";
        break;
      case "top15":
        url += "top-15";
        break;
      case "recent":
        url += "recently-added?limit=20";
        break;
      case "watched":
        url += "recently-watched?limit=20";
        break;
      default:
        url += "most-popular?limit=20";
    }

    const headers: any = {};
    if (type === "watched" && token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, { headers });
      const data = await res.json();
      setMovies(data.items || []);
    } catch (err) {
      console.error("Error loading movies:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadByCategory = async () => {
    if (!selectedCategory) return;
    setLoading(true);
    try {
      const res = await fetch(`http://34.10.139.168.nip.io/vercatalogo/catalog/category/${selectedCategory}?limit=20&offset=0`);
      const data = await res.json();
      setMovies(data.items || []);
    } catch (err) {
      console.error("Error loading category:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    const { setToken } = useAuth();
    setToken(null);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Video Catalog</h1>
          <div className="flex gap-4">
            <Link href="/upload" className="bg-green-600 px-4 py-2 rounded hover:bg-green-700">
              Upload Movie
            </Link>
            <Link href="/admin" className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-700">
              Admin Panel
            </Link>
            <button 
              onClick={handleLogout}
              className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => loadMovies("popular")}
            className={`px-4 py-2 rounded ${activeTab === "popular" ? "bg-blue-600" : "bg-gray-700"}`}
          >
            Most Popular
          </button>
          <button 
            onClick={() => loadMovies("top15")}
            className={`px-4 py-2 rounded ${activeTab === "top15" ? "bg-blue-600" : "bg-gray-700"}`}
          >
            Top 15
          </button>
          <button 
            onClick={() => loadMovies("recent")}
            className={`px-4 py-2 rounded ${activeTab === "recent" ? "bg-blue-600" : "bg-gray-700"}`}
          >
            Recently Added
          </button>
          <button 
            onClick={() => loadMovies("watched")}
            className={`px-4 py-2 rounded ${activeTab === "watched" ? "bg-blue-600" : "bg-gray-700"}`}
          >
            Recently Watched
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6">
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-700 p-2 rounded"
          >
            <option value="">Select Category</option>
            {categories.map(cat => (
              <option key={cat.category_id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
          <button 
            onClick={loadByCategory}
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
          >
            Filter by Category
          </button>
        </div>

        {/* Movies Grid */}
        {loading ? (
          <p>Loading movies...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {movies.map(movie => (
              <div key={movie.movie_id} className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-bold mb-2">{movie.title}</h3>
                <p className="text-sm text-gray-400 mb-2">Duration: {movie.duration_minutes} min</p>
                <p className="text-sm text-gray-400 mb-2">Views: {movie.view_count}</p>
                <p className="text-sm mb-3">
                  <span className={movie.is_free ? "text-green-500" : "text-yellow-500"}>
                    {movie.is_free ? "Free" : "Premium"}
                  </span>
                </p>
                <Link 
                  href={`/watch/${movie.slug}`}
                  className="block bg-blue-600 text-center py-2 rounded hover:bg-blue-700"
                >
                  Watch
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

## 6. app/watch/[slug]/page.tsx
```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";

export default function WatchMovie() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const slug = params.slug as string;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [log, setLog] = useState<string[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [mediaSource, setMediaSource] = useState<MediaSource | null>(null);
  const [sourceBuffer, setSourceBuffer] = useState<SourceBuffer | null>(null);
  const [queue, setQueue] = useState<Uint8Array[]>([]);
  const [timeInput, setTimeInput] = useState(0);

  const addLog = (msg: string) => {
    const timestamp = new Date().toISOString().slice(11, 19);
    setLog(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  const base64ToBytes = (b64: string) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  };

  const prepareMovie = async () => {
    const url = `http://34.10.139.168.nip.io/verpeli/movie/${encodeURIComponent(slug)}/prepare`;
    addLog(`POST ${url}`);
    
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (!res.ok) {
        addLog(`Prepare FAILED: ${res.status} ${JSON.stringify(data)}`);
        return false;
      }
      
      addLog(`Prepare OK: ${JSON.stringify(data)}`);
      return true;
    } catch (err) {
      addLog(`Prepare error: ${err}`);
      return false;
    }
  };

  const connectWebSocket = () => {
    const wsUrl = `ws://34.10.139.168.nip.io/verpeli/movie/ws/watch/${encodeURIComponent(slug)}`;
    addLog(`Connecting WS ${wsUrl}`);
    
    const newMediaSource = new MediaSource();
    const newWs = new WebSocket(wsUrl);
    
    newMediaSource.addEventListener("sourceopen", () => {
      addLog("MediaSource open");
    });

    newWs.onopen = () => addLog("WS connected");
    newWs.onclose = () => addLog("WS closed");
    newWs.onerror = () => addLog("WS error");
    
    newWs.onmessage = (evt) => {
      let msg;
      try { 
        msg = JSON.parse(evt.data); 
      } catch { 
        return; 
      }

      if (msg.type === "meta") {
        const codecs = `video/mp4; codecs="${msg.codecs || 'avc1.42E01E, mp4a.40.2'}"`;
        if (!sourceBuffer) {
          const sb = newMediaSource.addSourceBuffer(codecs);
          sb.mode = "segments";
          setSourceBuffer(sb);
        }
        addLog(`meta: codecs=${codecs}`);
      }

      if (msg.type === "init" || msg.type === "segment") {
        const data = base64ToBytes(msg.base64);
        setQueue(prev => [...prev, data]);
        addLog(`${msg.type} received`);
      }

      if (msg.type === "eos") {
        try { 
          newMediaSource.endOfStream(); 
        } catch {}
        addLog("end of stream");
      }

      if (msg.type === "ack" || msg.type === "status") {
        addLog(`${msg.type}: ${JSON.stringify(msg)}`);
      }
    };

    setWs(newWs);
    setMediaSource(newMediaSource);
    
    if (videoRef.current) {
      videoRef.current.src = URL.createObjectURL(newMediaSource);
    }
  };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    
    const init = async () => {
      const prepared = await prepareMovie();
      if (prepared) {
        setTimeout(() => connectWebSocket(), 300);
      }
    };
    
    init();

    return () => {
      if (ws) ws.close();
    };
  }, [slug, token]);

  useEffect(() => {
    if (sourceBuffer && !sourceBuffer.updating && queue.length > 0) {
      const chunk = queue[0];
      setQueue(prev => prev.slice(1));
      
      try {
        sourceBuffer.appendBuffer(chunk);
      } catch (err) {
        setQueue(prev => [chunk, ...prev]);
        setTimeout(() => {}, 180);
      }
    }
  }, [sourceBuffer, queue]);

  const sendCommand = (cmd: any) => {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(cmd));
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="container mx-auto">
        <button 
          onClick={() => router.push("/catalog")}
          className="mb-4 bg-gray-700 px-4 py-2 rounded hover:bg-gray-600"
        >
          ← Back to Catalog
        </button>

        <h1 className="text-2xl font-bold mb-4">Watching: {slug}</h1>

        {/* Video Player */}
        <video 
          ref={videoRef}
          controls
          className="w-full max-w-4xl bg-black rounded-lg mb-4"
        />

        {/* Controls */}
        <div className="bg-gray-800 p-4 rounded-lg mb-4 max-w-4xl">
          <div className="flex gap-2 mb-2">
            <input 
              type="number"
              value={timeInput}
              onChange={(e) => setTimeInput(Number(e.target.value))}
              className="bg-gray-700 px-2 py-1 rounded w-24"
              placeholder="Time (s)"
            />
            <button 
              onClick={() => sendCommand({ type: "SEEK", timeSec: timeInput })}
              className="bg-blue-600 px-4 py-1 rounded hover:bg-blue-700"
            >
              Seek
            </button>
            <button 
              onClick={() => sendCommand({ type: "START", startTimeSec: timeInput })}
              className="bg-green-600 px-4 py-1 rounded hover:bg-green-700"
            >
              Start
            </button>
            <button 
              onClick={() => sendCommand({ type: "PLAY" })}
              className="bg-blue-600 px-4 py-1 rounded hover:bg-blue-700"
            >
              Play
            </button>
            <button 
              onClick={() => sendCommand({ type: "PAUSE" })}
              className="bg-yellow-600 px-4 py-1 rounded hover:bg-yellow-700"
            >
              Pause
            </button>
            <button 
              onClick={() => sendCommand({ type: "STOP" })}
              className="bg-red-600 px-4 py-1 rounded hover:bg-red-700"
            >
              Stop
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-gray-800 p-4 rounded-lg max-w-4xl">
          <h2 className="font-bold mb-2">Logs</h2>
          <pre className="bg-black text-green-400 p-2 rounded text-xs overflow-auto max-h-48">
            {log.join("\n")}
          </pre>
        </div>
      </div>
    </div>
  );
}
```

## 7. middleware.ts (in root, same level as app/)
```tsx
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token');
  const isAuthPage = request.nextUrl.pathname === '/login';
  
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/catalog', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/catalog/:path*', '/watch/:path*', '/upload/:path*', '/admin/:path*', '/login']
};
```

## 8. app/upload/page.tsx
```tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";

export default function UploadMovie() {
  const router = useRouter();
  const { token } = useAuth();
  
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [synopsis, setSynopsis] = useState("Test clip");
  const [categories, setCategories] = useState("accion");
  const [language, setLanguage] = useState("spanish");
  const [availFrom, setAvailFrom] = useState("2025-01-01");
  const [availUntil, setAvailUntil] = useState("2026-01-01");
  const [isFree, setIsFree] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  // Category creation
  const [catName, setCatName] = useState("Acción");
  const [catSlug, setCatSlug] = useState("accion");

  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [token]);

  const createCategory = async () => {
    if (!catName || !catSlug) {
      setMessage("Category name and slug required");
      return;
    }

    try {
      const res = await fetch("http://34.10.139.168.nip.io/inventario/catalog/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: catName, slug: catSlug })
      });

      const data = await res.json();
      if (res.ok || res.status === 409) {
        setMessage("Category ready: " + catSlug);
      } else {
        setMessage(`Category creation failed: ${res.status}`);
      }
    } catch (err) {
      setMessage(`Error creating category: ${err}`);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      setMessage("Please select a video file");
      return;
    }

    setUploading(true);
    setMessage("");

    const form = new FormData();
    form.append("title", title);
    form.append("slug", slug);
    form.append("synopsis_short", synopsis);
    form.append("category_slugs", categories);
    form.append("language", language);
    form.append("available_from", availFrom);
    form.append("available_until", availUntil);
    form.append("is_free", String(isFree));
    form.append("video", videoFile);

    try {
      const res = await fetch("http://34.10.139.168.nip.io/inventario/catalog/movies", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}` 
        },
        body: form
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Movie uploaded successfully!");
        setTimeout(() => router.push("/catalog"), 2000);
      } else {
        setMessage(`Upload failed: ${res.status} ${JSON.stringify(data)}`);
      }
    } catch (err) {
      setMessage(`Error uploading: ${err}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="container mx-auto max-w-2xl">
        <button 
          onClick={() => router.push("/catalog")}
          className="mb-4 bg-gray-700 px-4 py-2 rounded hover:bg-gray-600"
        >
          ← Back to Catalog
        </button>

        <h1 className="text-2xl font-bold mb-6">Upload Movie</h1>

        {/* Category Creation */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="font-bold mb-4">1) Create/Ensure Category</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-2">Category Name</label>
              <input 
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block mb-2">Category Slug</label>
              <input 
                type="text"
                value={catSlug}
                onChange={(e) => setCatSlug(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded"
              />
            </div>
          </div>
          <button 
            onClick={createCategory}
            className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
          >
            Create/Ensure Category
          </button>
        </div>

        {/* Movie Upload Form */}
        <form onSubmit={handleUpload} className="bg-gray-800 p-4 rounded-lg">
          <h2 className="font-bold mb-4">2) Upload Movie</h2>
          
          <div className="mb-4">
            <label className="block mb-2">Title</label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2">Slug (unique)</label>
            <input 
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2">Synopsis</label>
            <input 
              type="text"
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2">Category Slugs (csv)</label>
            <input 
              type="text"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2">Language</label>
            <input 
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-2">Available From</label>
              <input 
                type="date"
                value={availFrom}
                onChange={(e) => setAvailFrom(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block mb-2">Available Until</label>
              <input 
                type="date"
                value={availUntil}
                onChange={(e) => setAvailUntil(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input 
                type="checkbox"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="mr-2"
              />
              Is Free
            </label>
          </div>

          <div className="mb-4">
            <label className="block mb-2">Video File</label>
            <input 
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className="w-full"
              ```