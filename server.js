const express = require('express');
const session = require('express-session');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'ca1-b8is124-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 600000 } // 10 minutes
}));

// Initialize history array per session
app.use((req, res, next) => {
  if (!req.session.history) req.session.history = [];
  next();
});

app.get('/', (req, res) => {
  const history = req.session.history.slice(-10).reverse();
  const result = req.query.result || '';
  const error = req.query.error || '';

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CA1 Calculator</title>
      <style>
        body { font-family: Arial, sans-serif; display: flex; max-width: 800px; margin: 50px auto; }
        #calc { flex: 1; padding: 20px; border-right: 1px solid #ccc; }
        #history { flex: 1; padding: 20px; background: #f5f5f5; height: 400px; overflow-y: auto; }
        form { margin: 20px 0; }
        input, select, button { padding: 10px; margin: 5px; font-size: 18px; }
        #result { font-size: 24px; font-weight: bold; color: green; }
        #error { font-size: 16px; color: red; }
        .op { margin: 5px 0; padding: 5px; background: white; border: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div id="calc">
        <h1>Calculator – GCP App Engine</h1>
        <form method="POST" action="/">
          <input type="number" name="num1" placeholder="Number 1" step="any" required autofocus><br>
          <select name="op">
            <option value="+">+</option>
            <option value="-">−</option>
            <option value="*">×</option>
            <option value="/">÷</option>
          </select><br>
          <input type="number" name="num2" placeholder="Number 2" step="any" required><br>
          <button type="submit">=</button>
        </form>
        <div id="result">${result}</div>
        <div id="error">${error}</div>
      </div>
      <div id="history">
        <h2>Previous operations</h2>
        ${history.length
          ? history.map(h => `<div class="op">${h}</div>`).join('')
          : '<p>No history yet</p>'}
      </div>
    </body>
    </html>
  `);
});

app.post('/', (req, res) => {
  const { num1, num2, op } = req.body;
  const a = parseFloat(num1);
  const b = parseFloat(num2);

  if (isNaN(a) || isNaN(b)) {
    return res.redirect('/?error=Non-numeric values');
  }

  let result;
  switch (op) {
    case '+': result = a + b; break;
    case '-': result = a - b; break;
    case '*': result = a * b; break;
    case '/':
      if (b === 0) return res.redirect('/?error=Division by zero');
      result = a / b;
      break;
    default:
      return res.redirect('/?error=Invalid operation');
  }

  const expr = `${a} ${op} ${b} = ${result}`;
  req.session.history.push(expr);

  res.redirect(`/?result=${result}`);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
