import { Hono } from "hono";
import { auth } from "../auth";
import { createAuthClient } from "better-auth/client";
import { mcpauth } from "../mcpauth";
import { mcpRouter } from "./mcp";

const app = new Hono<{ Bindings: CloudflareBindings }>();

const authClient = createAuthClient({
  baseURL: "http://localhost:8787/api/auth",
});

// Serve the frontend
app.get("/", async (c) => {
  const session = await auth(c.env).api.getSession({
    headers: new Headers(c.req.header()),
  });

  if (session?.user) {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MCP Auth - Hono - Welcome</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #f0f2f5;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
            .welcome-container {
              width: 360px;
              background: #fff;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              text-align: center;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 20px;
              color: #1c1e21;
            }
            .signout-link {
              display: inline-block;
              padding: 12px 20px;
              background-color: #dc3545;
              color: #fff;
              border: none;
              border-radius: 6px;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
              text-decoration: none;
              transition: background-color 0.2s;
            }
            .signout-link:hover {
              background-color: #c82333;
            }
          </style>
        </head>
        <body>
          <div class="welcome-container">
            <h1>Hello, ${session.user.name}</h1>
            <a href="/api/sign-out" class="signout-link">Sign Out</a>
          </div>
        </body>
      </html>
    `);
  }

  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Hono Auth</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f0f2f5;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          .container {
            width: 360px;
            background: #fff;
            padding: 20px 40px 40px 40px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          .tab-header {
            display: flex;
            margin-bottom: 20px;
            border-bottom: 1px solid #dddfe2;
          }
          .tab-link {
            flex: 1;
            padding: 15px;
            text-align: center;
            cursor: pointer;
            background: none;
            border: none;
            font-size: 18px;
            font-weight: 600;
            color: #606770;
            border-bottom: 3px solid transparent;
            transition: all 0.2s;
          }
          .tab-link.active {
            color: #1877f2;
            border-bottom-color: #1877f2;
          }
          .tab-content {
            display: none;
          }
          h1 {
            font-size: 24px;
            margin-bottom: 20px;
            color: #1c1e21;
            text-align: center;
          }
          form {
            display: flex;
            flex-direction: column;
          }
          label {
            margin-bottom: 5px;
            font-weight: 600;
            color: #606770;
          }
          input {
            padding: 12px;
            margin-bottom: 15px;
            border: 1px solid #dddfe2;
            border-radius: 6px;
            font-size: 16px;
          }
          button[type="submit"] {
            padding: 12px;
            background-color: #1877f2;
            color: #fff;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background-color 0.2s;
            margin-top: 10px;
          }
          button[type="submit"]:hover {
            background-color: #166fe5;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="tab-header">
            <button class="tab-link active" onclick="openTab(event, 'signin')">Sign In</button>
            <button class="tab-link" onclick="openTab(event, 'signup')">Sign Up</button>
          </div>

          <div id="signin" class="tab-content">
            <h1>Sign In</h1>
            <form action="/api/sign-in" method="POST">
              <label for="signin-email">Email:</label>
              <input type="email" id="signin-email" name="email" required>
              <label for="signin-password">Password:</label>
              <input type="password" id="signin-password" name="password" required>
              <button type="submit">Sign In</button>
            </form>
          </div>

          <div id="signup" class="tab-content">
            <h1>Sign Up</h1>
            <form action="/api/sign-up" method="POST">
              <label for="name">Name:</label>
              <input type="text" id="name" name="name" required>
              <label for="email">Email:</label>
              <input type="email" id="email" name="email" required>
              <label for="password">Password:</label>
              <input type="password" id="password" name="password" required>
              <button type="submit">Sign Up</button>
            </form>
          </div>
        </div>

        <script>
          function openTab(evt, tabName) {
            let i, tabcontent, tablinks;
            tabcontent = document.getElementsByClassName("tab-content");
            for (i = 0; i < tabcontent.length; i++) {
              tabcontent[i].style.display = "none";
            }
            tablinks = document.getElementsByClassName("tab-link");
            for (i = 0; i < tablinks.length; i++) {
              tablinks[i].className = tablinks[i].className.replace(" active", "");
            }
            document.getElementById(tabName).style.display = "block";
            evt.currentTarget.className += " active";
          }
          // Show the first tab by default
          document.addEventListener('DOMContentLoaded', () => {
             document.querySelector('.tab-link').click();
          });
        </script>
      </body>
    </html>
  `);
});

// Placeholder for serving the static bundle
app.get("/static/bundle.js", (c) => {
  return c.text("// In a real app, this would be your bundled client.ts");
});

app.get("/api/sign-out", async (c) => {
  const { headers, response } = await auth(c.env).api.signOut({
    returnHeaders: true,
    headers: new Headers(c.req.header()),
  });

  headers.forEach((value, key) => {
    c.res.headers.append(key, value);
  });

  return c.redirect("/", 302);
});

app.post("/api/sign-in", async (c) => {
  const formData = await c.req.formData();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return c.json({ error: "Missing email or password" }, 400);
  }

  try {
    const { headers, response } = await auth(c.env).api.signInEmail({
      returnHeaders: true,
      body: {
        email,
        password,
      },
    });

    if (response.token) {
      headers.forEach((value, key) => {
        c.res.headers.append(key, value);
      });
      return c.redirect("/", 302);
    }

    return c.redirect("/?error=Invalid email or password", 302);
  } catch (t) {
    console.error(t);
    return c.redirect("/?error=Internal Server Error", 302);
  }
});

app.post("/api/sign-up", async (c) => {
  const formData = await c.req.formData();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password) {
    return c.redirect("/?error=Missing email or password", 302);
  }

  try {
    const { headers, response } = await auth(c.env).api.signUpEmail({
      returnHeaders: true,
      body: {
        name,
        email,
        password,
      },
    });

    if (response.token) {
      headers.forEach((value, key) => {
        c.res.headers.append(key, value);
      });
      return c.redirect("/", 302);
    }

    return c.redirect("/?error=Invalid sign up", 302);
  } catch (t) {
    console.error(t);
    return c.redirect("/?error=Internal Server Error", 302);
  }
});


app.on(["GET", "POST", "OPTIONS"], "/api/oauth/*", (c, next) => {
  return mcpauth(c.env).handler(c, next);
});
app.on(["GET", "POST", "OPTIONS"], "/.well-known/*", (c, next) => {
  return mcpauth(c.env).handler(c, next);
});
app.route("/mcp", mcpRouter);

export default app;
