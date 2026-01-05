const express = require('express');
const session = require('express-session');
const { Storage } = require('@google-cloud/storage');
const app = express();
const port = process.env.PORT || 8080;

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT
});
const bucketName = process.env.BUCKET_NAME || 'ca1-calculator-logs';
const bucket = storage.bucket(bucketName);

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
        .info { font-size: 12px; color: #999; margin-top: 20px; }
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
        <div class="info">
          <p><strong>Services:</strong></p>
          <p>✓ App Engine (compute)</p>
          <p>✓ Cloud Storage (logs)</p>
          <p>✓ Cloud Build (CI/CD)</p>
        </div>
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

app.post('/', async (req, res) => {
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

  // Log operation to Cloud Storage
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation: expr,
      result: result
    };

    // Write to a JSON log file in Cloud Storage
    const file = bucket.file('calculator-logs.json');
    const [exists] = await file.exists();

    let logs = [];
    if (exists) {
      const data = await file.download();
      logs = JSON.parse(data.toString());
    }

    logs.push(logEntry);

    // Keep only last 10 operations
    if (logs.length > 10) {
      logs = logs.slice(-10);
    }

    await file.save(JSON.stringify(logs, null, 2));
    console.log(`Logged operation to Cloud Storage: ${expr}`);
  } catch (error) {
    console.error('Error logging to Cloud Storage:', error.message);
    // Don't block the operation if Cloud Storage fails
  }

  res.redirect(`/?result=${result}`);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
