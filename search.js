const textInput = document.getElementById('searchText');
const textSearchType = document.getElementById('textSearchType');

const searchButton = document.getElementById('searchButton');
const sortType = document.getElementById('sortType');
const sortDirrection = document.getElementById('sortDirrection');

const cardSearchResults = document.getElementById('results');

const cardTypeSearch = document.getElementById('cardTypeSearch');
const cardSupertypeSearch = document.getElementById('cardSupertypeSearch');

const resultDetails = document.getElementById('resultDetails');

let pageIndex = 0;

function nullSafty(s, alt=''){
    return (s == null) ? alt : s;
}

function inspectCard(card, preview=false){
    document.getElementById('cardName').innerText = card.name;

    document.getElementById('card').style = `background-image: url(${card.image});`

    document.getElementById('cardType').innerText = card.type;
    document.getElementById('cardPowerToughness').innerText = 
        `${nullSafty(card.power)}/${nullSafty(card.toughness)}`;

    let price = 'unspecified';
    if(card.price != null){
        price = `\$${card.price}`;
    }

    document.getElementById('cardPrice').innerText = price;
    
    //
        
    let tcgPurchase = document.querySelector("#purchaseUrls > *[icon = \"tcg\"]");
    let ckPurchase = document.querySelector("#purchaseUrls > *[icon = \"ck\"]");
    let cmPurchase = document.querySelector("#purchaseUrls > *[icon = \"cm\"]");

    tcgPurchase.onclick = ()=>{
        if(card.tcgPlayer)
            window.open(card.tcgPlayer);
    };

    ckPurchase.onclick = ()=>{
        if(card.cardKingdom)
            window.open(card.cardKingdom);
    };

    cmPurchase.onclick = ()=>{
        if(card.cardMarket)
            window.open(card.cardMarket);
    };
    

    tcgPurchase.setAttribute('found', !!card.tcgPlayer);
    ckPurchase.setAttribute('found', !!card.cardKingdom);
    cmPurchase.setAttribute('found', !!card.cardMarket);

    //

    if(!preview){
        document.getElementById('currentPrintButton').value = card.setCode;

        document.getElementById('cardPrintings').innerHTML = '';

        let printings = card.printings;
        //printings[printings.indexOf(card.setCode)] = printings[0];
        //printings[0] = card.setCode;

        printings.forEach((item) => {
            let printSelection = document.createElement('div');
            printSelection.value = item;
            printSelection.innerText = item;

            printSelection.addEventListener('mouseenter', async ()=>{
                let result = await findCard(card.name, item);

                inspectCard(result, true);
            })

            printSelection.addEventListener('mouseleave', async ()=>{
                document.getElementById('card').style = 
                    `background-image: url(${card.image});`
            })

            printSelection.addEventListener('click', async ()=>{
                let result = await findCard(card.name, item);

                inspectCard(result);
            });

            document.getElementById('cardPrintings').appendChild(printSelection);
        });
    }
}

function displayCards(results){
    cardSearchResults.innerHTML = '';

    results.forEach(card => {
        let cardElement = document.createElement('div');

        cardElement.style = `background-image: url('${card.image}')`;

        cardElement.addEventListener('click', ()=>{
            inspectCard(card);
        });

        cardSearchResults.appendChild(cardElement);

        console.log(card);
    });


}

async function search(){
    let conditions = [];

    if(cardTypeSearch.value != ''){
        conditions.push(`types LIKE '%${cardTypeSearch.value}%'`)
    }

    if(cardSupertypeSearch.value != ''){
        conditions.push(`supertypes LIKE '%${cardSupertypeSearch.value}%'`)
    }

    //
    let colors = [];
    let notColors = [];
        

    [...document.getElementById('colorType').children].forEach((item) => {
        let colorType = item.getAttribute('color-type');

        if(item.checked){
            colors.push(colorType);
        }else{
            notColors.push(colorType);
        }
    });

    let exclusivity = document.getElementById('colorTypeExclusivity').value;

    let s = [];

    colors.forEach(color => {
        if(color == 'C'){
            let command = [];

            notColors.forEach((item) => {
                command.push(`(
                    (manaCost IS NOT NULL AND manaCost NOT LIKE '%${item}%') OR
                    (manaCost IS NULL and text NOT LIKE '%${item}%')
                )`);
            });

            s.push(`(${command.join(' AND ')})`);
        } else{
            s.push(`coloridentity LIKE '%${color}%'`);
        }
    });

    // Exactly these color, remove all others
    let negative = '';
    if(exclusivity == 'XAND' || exclusivity == 'OR'){
        notColors.forEach(color => {
            negative += `AND coloridentity NOT LIKE '%${color}%' `;
        });
    }

    if(s.length != 0 && colors.length != 0){
        let query = s.join(` ${exclusivity.replace('XAND', 'AND')} `);

        query = `(${query}) ${negative}`

        conditions.push(query);
    }

    //

    [results, start, end, count] = await searchDB(
        textInput.value,
        textSearchType.value,
        sortType.value,
        sortDirrection.value == 'ASC',
        conditions,
        pageIndex
    );

    resultDetails.innerText = `Showing ${start} - ${end} of ${count}`;

    displayCards(results);
}

searchButton.addEventListener('click', async ()=>{
    pageIndex = 0;

    await search();
})

function nextPage(){
    pageIndex++;

    (async ()=>{
        await search();
    })();
}

function previousPage(){
    pageIndex--;

    (async ()=>{
        await search();
    })();
}
