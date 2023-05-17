Så meg lei av at jeg ikke kan søke i alle bolig annonser for mitt område, det vil si at eg vil ha muligheten til å kunne se alle boligannonser uavhengig om dei er solgt/aktiv/inaktiv.

Derfor laget jeg denne web scraperen for å lett kunne lagre alle finn annonser for mitt område i min egen database. Her bruker eg 'mysql' og all info som trengs for både url til scraping og Database config ligger/legges i .env filen.

Slik skal env filen settes opp, bytt ut placeholder teksten i din egen login/link/db etc. :

```
-HOST=localhost
-USER=eksempelbruker
-PASSWORD=dittpassordher
-DATABASE=scraped_data

//The Finn.no url you want to scrape:
-URL=dinFinnLinkSkalHer
```

En utfyllende readme kjemer når eg får tid, dette er egentlig bare placeholder tekst.
