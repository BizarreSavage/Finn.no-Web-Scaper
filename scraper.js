const fs = require('fs');
const logStream = fs.createWriteStream('log.txt', {flags: 'a'});  // 'a' means appending
const axios = require('axios');
const cheerio = require('cheerio');
const mysql = require('mysql');
require('dotenv').config();

logStream.write('New scrape at: ' + new Date + '\n');

// MySQL database configuration
const dbConfig = {
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
  };

// Fetch HTML content from the finn.no URL
const fetchData = async () => {
    try {
      const response = await axios.get(process.env.URL);
      const html = response.data; // Define and assign the HTML content to the 'html' variable
      return html;
    } catch (error) {
      console.log('Error fetching data:', error);
    }
  };

// Extract data from HTML and save new items to the MySQL database
const scrapeData = (html) => {
    const $ = cheerio.load(html);
    const houseAds = [];

    $('.relative.cursor-pointer.overflow-hidden.relative.transition-all.outline-none.f-card.rounded-8').each((index, element) => {
        const adElement = $(element);
        let url = adElement.find('a.sf-search-ad-link').attr('href') || adElement.find('a.sf-search-ad-link.absolute.inset-0').attr('href');
        let thumbnail = adElement.find('a.sf-search-ad-link div.aspect-w-16.aspect-h-9.bg-white img').attr('src') || adElement.find('div.sf-realestate-image img').attr('src') || adElement.find('a .aspect-w-16.aspect-h-9 img').attr('src');
        let title = adElement.find('h3').text().trim() || adElement.find('h3.h4.mb-0.sf-realestate-heading').text().trim();
        let price = adElement.find('.mt-16.flex span:nth-child(2)').text().trim() || adElement.find('.mt-16.flex.justify-between span:nth-child(2)').text().trim();
        let area = adElement.find('.mt-16.flex span:nth-child(1)').text().trim() || adElement.find('.mt-16.flex.justify-between span:nth-child(1)').text().trim();
        let address = adElement.find('.mt-4 span.text-14.text-gray-500').text().trim() || adElement.find('.mt-4 span.text-14.text-gray-500').text().trim();
        houseAds.push({ url, thumbnail, title, price, area, address });
    });
  
    // Remove duplicate URLs
    const uniqueHouseAds = houseAds.reduce((unique, ad) => {
      const exists = unique.some((existingAd) => existingAd.url === ad.url);
      if (!exists) {
        unique.push(ad);
      }
      return unique;
    }, []);
    
  
    // Save new items to MySQL database
    const connection = mysql.createConnection(dbConfig);
  connection.connect();

  let newEntriesCounter = 0; // Counter for new entries
  const queries = uniqueHouseAds.map(({ url, thumbnail, title, price, area, address  }) => {
    return new Promise((resolve, reject) => {
      const checkQuery = 'SELECT COUNT(*) AS count FROM scraped_data WHERE url = ?';
      const checkValues = [url];
      connection.query(checkQuery, checkValues, (error, results) => {
        if (error) {
          console.log('Error checking data:', error);
          reject(error);
        } else {
          if (results[0].count === 0) { 
            newEntriesCounter++; // Increase the counter if a new entry is found
            const insertQuery = 'INSERT INTO scraped_data (url, thumbnail, title, price, area, address ) VALUES (?, ?, ?, ?, ?, ?)';
            const insertValues = [url, thumbnail, title, price, area, address ];
            connection.query(insertQuery, insertValues, (error, results) => {
              if (error) {
                console.log('Error saving data:', error);
                reject(error);
              } else {
                logStream.write('New entry added to database at ' + new Date + '. URL: ' + url + '\n');  // Log new entry
                console.log('New entry found! Check your log.txt file for more information')
                resolve();
              }
            });
          } else {
            
            resolve();
          }
        }
      });
    });
  });

  Promise.all(queries)
    .then(() => {
      connection.end();
      if (newEntriesCounter === 0) { // If no new entries were found, log the message
        console.log('No new entries found, remember to scrape regulary to find new entries.');
      }
    })
    .catch((error) => {
      console.error('Error executing queries:', error);
      connection.end();
    });
};

// Check if the 'scraped_data' table exists in the database
const checkTableExists = () => {
    return new Promise((resolve, reject) => {
      const connection = mysql.createConnection(dbConfig);
      connection.connect();
  
      const query = "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'scraped_data'";
      const values = [dbConfig.database];
      connection.query(query, values, (error, results) => {
        if (error) {
          console.log('Error checking table existence:', error);
          reject(error);
        } else {
          const count = results[0].count;
          resolve(count > 0);
        }
      });
  
      connection.end();
    });
  };

// Create the 'scraped_data' table if it doesn't exist
const createTable = (html) => {
  const connection = mysql.createConnection(dbConfig);
  connection.connect();

  const query = `CREATE TABLE IF NOT EXISTS scraped_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(355),
    url VARCHAR(255),
    thumbnail VARCHAR(255),
    price VARCHAR(255),
    area VARCHAR(255),
    address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

  connection.query(query, (error, results) => {
    if (error) {
      console.log('Error creating table:', error);
    } else {
      console.log('Table created successfully!');
      scrapeData(html);
    }
    connection.end();
  });
};

// Main function
const main = async () => {
    const tableExists = await checkTableExists();
    if (!tableExists) {
      console.log('Creating table...');
      const html = await fetchData();
      console.log('Table does not exist. Creating...');
      createTable(html); // Pass the HTML to the createTable function
    } else {
      console.log('Fetching data...');
      const html = await fetchData();
      console.log('Data fetched successfully!');
      console.log('Scraping data...');
      await scrapeData(html);
      console.log('Data scraped and saved!');
    }
  };
  
  // Execute the main function
  main();
