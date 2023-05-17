const express = require('express');
const mysql = require('mysql');
const app = express();
app.set('view engine', 'ejs');
require('dotenv').config();

// MySQL database configuration
const dbConfig = {
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
  };

app.get('/', (req, res) => {
  const connection = mysql.createConnection(dbConfig);
  connection.connect();

  const query = 'SELECT * FROM scraped_data';
  connection.query(query, (error, results) => {
    if (error) {
      console.log('Error fetching data:', error);
      res.status(500).send('Error fetching data from database');
    } else {
      res.render('index', { houses: results });
    }
  });

  connection.end();
});

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});