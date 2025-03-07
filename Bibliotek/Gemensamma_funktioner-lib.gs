/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


var KONFIG;


/**
 * Funktion för att skapa menyn i kalkylarket
 */
function addMenuForSpreadsheet() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Scoutnet')
    .addSubMenu(ui.createMenu('Användare')
      .addItem('Synkronisera användare', 'synkroniseraAnvandare'))
    .addSubMenu(ui.createMenu('Grupper')
      .addItem('Synkronisera alla grupper', 'synkroniseraGrupper')
      .addItem('Synkronisera GrupperVissaRader1', 'synkroniseraGrupperVissaRader1')
      .addItem('Synkronisera GrupperVissaRader2', 'synkroniseraGrupperVissaRader2')
      .addItem('Synkronisera GrupperVissaRader3', 'synkroniseraGrupperVissaRader3')
      .addItem('Synkronisera GrupperVissaRaderOchEtikett1', 'synkroniseraGrupperVissaRaderOchEtikett1')
      .addItem('Synkronisera GrupperVissEtikett1', 'synkroniseraGrupperVissEtikett1')
      .addItem('Visa enkel layout', 'visaEnkelLayoutGrupper')
      .addItem('Visa avancerad layout', 'visaAvanceradLayoutGrupper'))
    .addSubMenu(ui.createMenu('Medlemslistor')
      .addItem('Uppdatera alla', 'MedlemslistorUppdateraEnbart'))
    .addToUi();
}


/**
 * Kontrollerar om inställningarna i Konfiguration.gs verkar korrekta
 * 
 * @param {Object} INPUT_KONFIG_OBJECT - Objekt med kårens konfiguration
 */
function checkDataFromKonfig(INPUT_KONFIG_OBJECT) {
  console.info("Kontrollera data från Konfiguration.gs");

  KONFIG = INPUT_KONFIG_OBJECT;
  
  console.info("*****************");
  console.info("Kårens domännamn");
  try {
    updateListOfGroups_();
    console.info(KONFIG.DOMAIN + " - KORREKT");
  } catch (e) {
    console.warn(KONFIG.DOMAIN + " - Eventuellt felaktig");
  }

  const url_all_members = 'https://' + KONFIG.SCOUTNET_URL + '/api/' + KONFIG.ORGANISATION_TYPE + '/memberlist';
  const allMembers = urlFetch_(url_all_members, KONFIG.API_KEY_LIST_ALL);

  const url_maillist = 'https://' + KONFIG.SCOUTNET_URL + '/api/' + KONFIG.ORGANISATION_TYPE + '/customlists?list_id=';
  const mailinglist = urlFetch_(url_maillist, KONFIG.API_KEY_MAILINGLISTS);

  console.info("*****************");
  console.info("Url till Scoutnet");

  if (allMembers || mailinglist) {
    console.info(KONFIG.SCOUTNET_URL + " - KORREKT");

    console.info("*****************");
    console.info("Kår-ID för webbtjänster (KONFIG.SCOUTNET_GROUP_ID)");
    console.info(KONFIG.SCOUTNET_GROUP_ID + " - KORREKT");

    console.info("*****************");
    console.info("Typ av enhet kår (group) eller distrikt (district)");
    console.info(KONFIG.ORGANISATION_TYPE + " - KORREKT");
  }
  else {
    console.warn(KONFIG.SCOUTNET_URL + " - Eventuellt felaktig");

    console.info("*****************");
    console.info("Kår-ID för webbtjänster (KONFIG.SCOUTNET_GROUP_ID)");
    console.warn(KONFIG.SCOUTNET_GROUP_ID + " - Eventuellt felaktig");

    console.info("*****************");
    console.info("Typ av enhet kår (group) eller distrikt (district)");
    console.warn(KONFIG.ORGANISATION_TYPE + " - Eventuellt felaktig");
  }

  console.info("*****************");
  console.info("API-nyckel för alla medlemmar (KONFIG.API_KEY_LIST_ALL)");
  if (allMembers) {
    console.info(KONFIG.API_KEY_LIST_ALL + " - KORREKT");
  }
  else {
    console.warn(KONFIG.API_KEY_LIST_ALL + " - Eventuellt felaktig");
  }

  console.info("*****************");
  console.info("API-nyckel för e-postlistor (KONFIG.API_KEY_MAILINGLISTS)");
  if (mailinglist) {
    console.info(KONFIG.API_KEY_MAILINGLISTS + " - KORREKT");
  }
  else {
    console.warn(KONFIG.API_KEY_MAILINGLISTS + " - Eventuellt felaktig");
  }

  console.info("*****************");
  console.info("E-post för skräppostmoderering (KONFIG.MODERATE_CONTENT_EMAIL)");
  if (checkEmailFormat_(KONFIG.MODERATE_CONTENT_EMAIL) && !checkIfGroupExists_(KONFIG.MODERATE_CONTENT_EMAIL)) {
    console.info(KONFIG.MODERATE_CONTENT_EMAIL + " - KORREKT");
  }
  else {
    console.warn(KONFIG.MODERATE_CONTENT_EMAIL + " - Eventuellt felaktig. Får ej vara en googlegrupp");
  }

  console.info("*****************");
  console.info("Adress till standardprofilbild (KONFIG.DEFAULT_USER_AVATAR_URL)");
  if (getByteArrayOfDefaultImage_()) {
    console.info(KONFIG.DEFAULT_USER_AVATAR_URL + " - KORREKT");
  }
  else {
    console.warn(KONFIG.DEFAULT_USER_AVATAR_URL + " - Eventuellt felaktig");
  }

  console.info("*****************");
  console.info("Avsändaradress för e-post som skickar användaruppgifter för kontaktsynkronisering (KONFIG.CONTACT_GROUPS_EMAIL_CREDENTIALS_SENDER_FROM)"); 
  if (getAllowedFromEmailAdresses_().includes(KONFIG.CONTACT_GROUPS_EMAIL_CREDENTIALS_SENDER_FROM)) {
    console.info(KONFIG.CONTACT_GROUPS_EMAIL_CREDENTIALS_SENDER_FROM + " - KORREKT");
  }
  else if ("" === KONFIG.CONTACT_GROUPS_EMAIL_CREDENTIALS_SENDER_FROM)  {
    console.info(KONFIG.CONTACT_GROUPS_EMAIL_CREDENTIALS_SENDER_FROM + " - KORREKT");
  }
  else  {
    console.warn(KONFIG.CONTACT_GROUPS_EMAIL_CREDENTIALS_SENDER_FROM + " - Eventuellt felaktig");
  }
}


/**
 * Tar bort punkter före @ om det är en gmailadress
 *
 * @param {string} email - E-postadress
 *
 * @returns {string} - E-postadress utan punkter före @ om gmailadress
 */
function getGmailAdressWithoutDots_(email) {
  
  const regexGmailDots = /(?:\.|\+.*)(?=.*?@gmail\.com)/g;
  
  email = email.replace(regexGmailDots, "");
  return email;
}


/**
 * Returnerar en lista över alla Googlekonton för underorganisationen som synkroniserar med Scoutnet
 *
 * @returns {Object[]} - Lista med objekt av Googlekonton i denna underorganisation
 */
function getGoogleAccounts_() {

  let listOfUsers = [];

  for (let n = 0; n < 6; n++) {
    if (0 !== n) {
      console.warn("Funktionen getGoogleAcounts körs " + n);
    }
    try {
      let pageToken, page;
      do {
        page = AdminDirectory.Users.list({
          domain: KONFIG.DOMAIN,
          query: "orgUnitPath='" + KONFIG.DEFAULT_ORG_UNIT_PATH + "'",
          orderBy: 'givenName',
          maxResults: 150,
          pageToken: pageToken
        });
        const users = page.users;
        if (users) {
          for (let i = 0; i < users.length; i++) {
            const user = users[i];
            listOfUsers.push(user);
            //console.log('%s (%s)', user.name.fullName, user.primaryEmail);
          }
        } else {
          console.warn('Ingen användare hittades i denna underoganisation.');
          return [];
        }
        pageToken = page.nextPageToken;
      } while (pageToken);

      return listOfUsers;
    
    } catch(e) {
      console.error("Problem med att anropa GoogleTjänst Users.list i funktionen getGoogleAccounts");
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }  
}


/**
 * Returnera gruppmedlemmar för en specifik grupp
 *
 * @param {string} groupId - Googles id för en grupp
 *
 * @returns {Object[]} members - Lista av medlemsobjekt med attributen email, role, memberId för medlemmar i en grupp
 */
function getGroupMembers_(groupId) {
  
  for (let n = 0; n < 6; n++) {
    if (0 !== n) {
      console.warn("Funktionen getGroupMembers körs " + n);
    }    
    try {
      const group = [];
      
      let pageToken, page;
      do {
        page = AdminDirectory.Members.list(groupId,{
          domainName: KONFIG.DOMAIN,
          maxResults: 150,
          pageToken: pageToken,
        });
        const members = page.members
        if (members) {
          for (let i = 0; i < members.length; i++) {
            let member = members[i];
            
            const gmailAdressWithoutDots = getGmailAdressWithoutDots_(member.email.toLowerCase());
            member = {
              email: gmailAdressWithoutDots,
              role: member.role,
              memberId: member.id
            };
            group.push(member);
          }
        }
        pageToken = page.nextPageToken;
      } while (pageToken);
      
      return group;
    
    } catch (e) {
      console.error("Problem med att anropa AdminDirectory.Members.list i getGroupMembers med:" + groupId);
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Hämta ett specificerat medlemsattributet för en specifik medlem
 * 
 * @param {Object} medlem - Ett medlemsobjekt
 * @param {string} nameOfField - Namn på ett medlemsattribut
 * @param {boolean} lowerCase - Om svaret ska konverteras till gemener
 *
 * @returns {string} - Data för det specifierade användarattributet
 */
function fetchScoutnetMemberFieldAsString_(medlem, nameOfField, lowerCase) {

  let fieldName = nameOfField;
  if (medlem[fieldName]){
    fieldName = medlem[fieldName].value;
    fieldName = JSON.stringify(fieldName);
    fieldName = fieldName.substring(1, fieldName.length - 1).trim();
    fieldName = fieldName.replace(/"/g, "");
    
    if (lowerCase) {
      fieldName = fieldName.toLowerCase();
    }
  }
  else {
    fieldName = "";
  } 
  return fieldName;
}


/**
 * Hämtar lista med personer som är med i någon av de e-postlistor eller e-postadresser som specificeras
 *
 * @param {string} scoutnet_list_id - Kommaseparerad sträng med List-id för en e-postlista i Scoutnet
 * @param {Object} cell_scoutnet_list_id - En cell i ett Google Kalkylblad
 * @param {string[]} listOfEmailAdressesOfActiveAccounts - Lista över e-postadresser för aktiva Googlekonton
 * @param {boolean} forceUpdate - Tvinga uppdatering av data eller ej från Scoutnet
 *
 * @returns {Object[]} allMembers - Lista med medlemsobjekt för de medlemmar på e-postlistorna
 */
function fetchScoutnetMembersMultipleMailinglists_(scoutnet_list_id, cell_scoutnet_list_id, listOfEmailAdressesOfActiveAccounts, forceUpdate) {
  
  const allMembers = [];
  scoutnet_list_id = getCleanString_(scoutnet_list_id);
  
  const listOfScoutnetListIds = scoutnet_list_id.split(",");  
  console.log("Antal olika listId eller e-postadresser angivna = " + listOfScoutnetListIds.length);

  const manuellEpostadress = [];
  
  for (let i = 0; i < listOfScoutnetListIds.length; i++) {
  
    if (checkIfEmail_(listOfScoutnetListIds[i])) { //Om e-postadress
      
      const member_manuell = {
        manuell: listOfScoutnetListIds[i] 
      };
      manuellEpostadress.push(member_manuell);
    }
    else if ((listOfScoutnetListIds[i].length === 1) && (listOfScoutnetListIds[i].indexOf("@") === 0)) { //Om @ för kårens googlekonton
      
      console.log("Lägg till kårens googlekonton på listan");
      for (let k = 0; k < listOfEmailAdressesOfActiveAccounts.length; k++) {
        
        const emailOfOneActiveAccount = listOfEmailAdressesOfActiveAccounts[k];
        
        const member_manuell = {
          manuell: emailOfOneActiveAccount
        };
        manuellEpostadress.push(member_manuell);
      }
    }
    else if (listOfScoutnetListIds[i]) { //Om e-postlista från Scoutnet angiven
      allMembers.push.apply(allMembers, fetchScoutnetMembersOneMailinglist_(listOfScoutnetListIds[i], cell_scoutnet_list_id, forceUpdate));
    }
  }
  
  const memberNumbers = getMemberNumbers_(allMembers); //Medlemmar med dessa medlemsnummer ska användas
  const members = getMembersByMemberNumbers_(allMembers, memberNumbers);
 
  if (manuellEpostadress.length !== 0) {
    members.push.apply(members, manuellEpostadress);
    console.log("Identifierade mannuellt tillagd e-post i stället för lista från Scoutnet");
    console.log("Om detta är fel, kontrollera så att det inte finns något @ på fel ställe");
  }  
  return members;
}


/**
 * Indata, lista över medlemmar
 * Returnera, lista över unika medlemsnummer för medlemmarna
 *
 * @param {Object[]} members - Lista med medlemsobjekt
 *
 * @returns {string[]} - Lista med unika medlemsnummer
 */
function getMemberNumbers_(members) {
  
  let memberNumbers = [];
  
  for (let i = 0; i < members.length; i++) {
    const memberNumber = members[i].member_no;
    if (memberNumber) {
      memberNumbers.push(memberNumber);
    }
  }
  //console.log(memberNumbers.length + " medlemsnummer innan dublettrensning");
  memberNumbers = removeDublicates_(memberNumbers);
  //console.log(memberNumbers.length + " medlemsnummer efter dublettrensning");
  return memberNumbers;
}


/**
 * Indata en sträng
 * Returnera sant eller falskt om det verkar vara en e-postadress
 *
 * @param {string} email - Textsträng
 *
 * @returns {boolean} - Sant eller falskt om det är en e-postadress
 */
function checkIfEmail_(email) {
  //Väldigt simpel koll a@b.c
  if ((email.length > 4) && email.includes("@") && email.includes(".")) {
    //console.log("Verkar vara en e-postadress");
    return true;
  }
  //console.log("Verkar EJ vara en e-postadress");
  return false;
}


/**
 * Hämta data från angiven url
 * 
 * @param {string} url - Url att hämta data från
 * @param {string} apiKey - API-nyckel att skicka med i anropet
 * 
 * @returns {string} - Datan som hämtats från Scoutnet
 */
function urlFetch_(url, apiKey) {

  const authHeader = 'Basic ' + Utilities.base64Encode(KONFIG.SCOUTNET_GROUP_ID + ':' + apiKey);
  const response = UrlFetchApp.fetch(
    url, {
      'muteHttpExceptions': true,
      'headers': { 'Authorization': authHeader}
    }
  ); 
  const json = response.getContentText();
  return json;
}


/**
 * Hämta lista med personer för denna e-postlista
 * Returnera lista med medlemsobjekt
 *
 * @param {string} scoutnet_list_id - List-id för en e-postlista i Scoutnet
 * @param {Object} cell_scoutnet_list_id - En cell i ett Google Kalkylblad
 * @param {boolean} forceUpdate - Tvinga uppdatering av data eller ej från Scoutnet
 *
 * @returns {Object[]} allMembers - Lista med medlemsobjekt för de medlemmar på e-postlistan
 */
function fetchScoutnetMembersOneMailinglist_(scoutnet_list_id, cell_scoutnet_list_id, forceUpdate) {
  
  const cacheExpirationInSeconds = 21600; //6 timmar
  console.time("Hämta e-postlista från Scoutnet " + scoutnet_list_id);
  
  const cache = CacheService.getScriptCache();
  
  const allMembers = [];

  if (scoutnet_list_id) {
    let kaka;
    let json;
    let data;

    if (forceUpdate || !(kaka = cache.get(scoutnet_list_id))) {

      const email_fields = '&contact_fields=email_mum,email_dad,alt_email,mobile_phone';
      const url = 'https://' + KONFIG.SCOUTNET_URL + '/api/' + KONFIG.ORGANISATION_TYPE + '/customlists?list_id=' + scoutnet_list_id + email_fields;
      json = urlFetch_(url, KONFIG.API_KEY_MAILINGLISTS);
      //console.log("Json.length " + json.length);

      //Kolla så att inte större än 100kb per kaka och sätt i så fall cache; om ej skippa det.
      //https://developers.google.com/apps-script/reference/cache/cache#put(String,String)
      //100KB ~ 102400 tecken från variabeln json
      //En medlem ~ 310 tecken. 100000/310 ~ max 320 medlemmar
      if (json.length < 100000) {
        cache.put(scoutnet_list_id, json, cacheExpirationInSeconds);
        //console.log("Skapa kaka med livslängd " + cacheExpirationInSeconds + " sekunder");
      }
      else {
        console.warn("För stor mängd data för att skapa en kaka. Kan därmed gå lite långsammare");
      }
    }
    else {
      console.log("Kakan för e-postlistan " + scoutnet_list_id + " fanns redan");
      json = kaka;
    }
    
    try {
      data = JSON.parse(json);
    }
    catch (e) { //Om fel
      console.error("Error. Gick ej att hämta listan " + scoutnet_list_id + " från Scoutnet");
      if (cell_scoutnet_list_id) {
        cell_scoutnet_list_id.setBackground("red");
      }

      console.timeEnd("Hämta e-postlista från Scoutnet " + scoutnet_list_id);
      return allMembers;
    }
    if (cell_scoutnet_list_id) {
      cell_scoutnet_list_id.setBackground("white");
    }

    const medlemmar = data.data;
    const variabel_lista_not_lowercase = ['member_no', 'first_name', 'last_name', 'mobile_phone'];
    //Dessa attributvärden ska användas som gemener för bättre jämförelser
    const variabel_lista_lowercase = ['email', 'email_mum', 'email_dad', 'alt_email', 'extra_emails', 'contact_email_mum', 'contact_email_dad', 'contact_alt_email'];

    for (x in medlemmar) {
      const medlem = medlemmar[x];
      const member = setMemberFields_(medlem, variabel_lista_not_lowercase, variabel_lista_lowercase);
      //console.log(member);
      allMembers.push(member);
    }
  }
  else {
    cell_scoutnet_list_id.setBackground("yellow");
  }
  
  console.timeEnd("Hämta e-postlista från Scoutnet " + scoutnet_list_id);
  return allMembers;
}


/**
 * Sätter attributen för en medlem då några kan saknas
 *
 * @param {Object} medlem - Ett medlemsobjekt
 * @param {string[]} variabel_lista_not_lowercase - Lista med attribut som ej ska göras om till gemener
 * @param {string[]} variabel_lista_lowercase - Lista med attribut som ska göras om till gemener
 *
 * @returns {Object} member - Ett medlemsobjekt
 */
function setMemberFields_(medlem, variabel_lista_not_lowercase, variabel_lista_lowercase) {
  
  let member = {};
  
  for (let i = 0; i < variabel_lista_not_lowercase.length; i++) {
    member[variabel_lista_not_lowercase[i]] = fetchScoutnetMemberFieldAsString_(medlem, variabel_lista_not_lowercase[i], false);
  }
  
  for (let i = 0; i < variabel_lista_lowercase.length; i++) {
    member[variabel_lista_lowercase[i]] = fetchScoutnetMemberFieldAsString_(medlem, variabel_lista_lowercase[i], true);
  }
  return member;
}


/**
 * Returnerar lista över medlemmar med de medlemsnummer som ges som indata
 *
 * @param {members[]} members - Lista med medlemsobjekt
 * @param {memberNumbers[]} memberNumers - Lista med medlemsnummer
 *
 * @returns {members[]} - Lista med medlemmar som har specificerade medlemsnummer
 */ 
function getMembersByMemberNumbers_(members, memberNumbers) {
  
  const memberList = [];
  
  Loop1:
  for (let i = 0; i < memberNumbers.length; i++) {
  
    for (let k = 0; k < members.length; k++) {
      
      if (memberNumbers[i] === members[k].member_no){
       
        //console.log("Medlemsnummer " + memberNumbers[i]);
        memberList.push(members[k]);
        continue Loop1;
      }
    }
  }
  return memberList;
}


/**
 * Hämtar lista över e-postadresser enligt specificerade parametrar
 *
 * @param {Object} member - Ett medlemsobjekt
 * @param {string} synk_option - Sträng som definerar synkroniseringsinställningar
 * @param {boolean} boolGoogleAccounts - Boolean som definierar om kårens Google-konton ska kunna inkluderas
 * 
 * @returns {string[]} - Lista över e-postadresser enligt specificerade attribut
 */
function getEmailListSyncOption_(member, synk_option, boolGoogleAccounts) {
  
  const member_emails = [];
  
  const email = member.email;
  const member_no = member.member_no;
  const email_mum = member.email_mum;
  const contact_email_mum = member.contact_email_mum;
  const email_dad = member.email_dad;
  const contact_email_dad = member.contact_email_dad;
  const email_alt = member.alt_email;
  const contact_email_alt = member.contact_alt_email;
  const extra_emails = member.extra_emails;
  const manuell = member.manuell; //Om vi manuellt lägger till någon i kalkylarket
  
  synk_option = synk_option.toLowerCase().trim();
  
  if (!member_no && manuell) { //Om ej medlem, alltså manuellt tillagd
    member_emails.push(manuell);
    return member_emails;
  }
  
  const googleAccountEmail = getGoogleAccount_(member_no);
  
  if (synk_option.includes("@") && boolGoogleAccounts) {
    //Lägg bara till om personen har ett google-konto via kåren och lägg till deras google-konto
    if (googleAccountEmail) { //Denna medlem har ett Googlekonto
      member_emails.push(googleAccountEmail);
    }
  }
  
  else { //Lägg bara till Scoutnet e-post
    if (synk_option.includes("m") || synk_option.includes("e") || synk_option.includes("f") || synk_option.includes("a")) {
      
      if (synk_option.includes("m")) { //Lägg bara till medlemmar som har en personlig e-postadress
        if (email) { //Lägg bara till personer med en egen e-postadress
          member_emails.push(email);
        }
      }
      if (synk_option.includes("e")) {
        //Lägg till medlemmars primära e-postadress + kopior enligt medlemsprofil
        if (extra_emails) { //Lägg till extra e-postadresser om det finns några
          
          const extra_email_list = extra_emails.split(",");
          //console.log(extra_email_list);
          member_emails.push.apply(member_emails, extra_email_list);
        }
        if (email) { //Lägg till medlemmars primära e-postadress
          member_emails.push(email);
        }
      }
      
      if (synk_option.includes("f")) { //Lägg bara tilll föräldrars e-postadress
        if (email_mum) { //Lägg till mammor (Anhörig 1) med en e-postadress
          member_emails.push(email_mum);
        }
        if (contact_email_mum) { //Lägg till mammor (Anhörig 1) med en e-postadress
          member_emails.push(contact_email_mum);
        }
        if (email_dad) { //Lägg till pappor (Anhörig 2) med en e-postadress
          member_emails.push(email_dad);
        }
        if (contact_email_dad) { //Lägg till pappor (Anhörig 2) med en e-postadress
          member_emails.push(contact_email_dad);
        }
      }
      
      if (synk_option.includes("a")) { //Lägg till alternativ e-postadress
        if (email_alt) { //Lägg till alternativ e-postadress
          member_emails.push(email_alt);
        }
        if (contact_email_alt) { //Lägg till alternativ e-postadress
          member_emails.push(contact_email_alt);
        }
      }
    }
    else { //Lägg till alla e-postadresser funna i Scoutnet
      //Upprepningen med t.ex mamma och pappa nedan är för att det inte är lika mellan olika API:er,
      //så vi testar de olika versionerna och ser vad som nappar
      if (email) { //Lägg till person med egen e-postadress
        member_emails.push(email);
      }
      if (email_mum) { //Lägg till mammor (Anhörig 1) med en e-postadress
        member_emails.push(email_mum);
      }
      if (contact_email_mum) { //Lägg till mammor (Anhörig 1) med en e-postadress
          member_emails.push(contact_email_mum);
      }
      if (email_dad) { //Lägg till pappor (Anhörig 2) med en e-postadress
        member_emails.push(email_dad);
      }
      if (contact_email_dad) { //Lägg till pappor (Anhörig 2) med en e-postadress
          member_emails.push(contact_email_dad);
        }
      if (email_alt) { //Lägg till alternativ e-postadress
        member_emails.push(email_alt);
      }
      if (contact_email_alt) { //Lägg till alternativ e-postadress
        member_emails.push(contact_email_alt);
      }
    }
  }
  
  if (!synk_option.includes("-") && boolGoogleAccounts) { //Lägg till både Scoutnet e-post och Google-konto e-post
    if (googleAccountEmail) { //Denna medlem har ett Googlekonto
      member_emails.push(googleAccountEmail);
    }
  }
  
  //console.log("Namn " + member.first_name + " " + member.last_name); 
  //console.log("med följande e-postadresser " + member_emails);
  
  return member_emails;
}


/**
 * Hämta lista över alla medlemmar
 * 
 * @param {boolean} forceUpdate - Tvinga uppdatering av data eller ej från Scoutnet
 * @param {boolean} fetchWaitingMembers - Om "medlemmar" från väntelistan ska hämtas i stället för riktiga medlemmar
 *
 * @returns {Object[]} allMembers - Lista med medlemsobjekt för alla medlemmar i kåren
 */
function fetchScoutnetMembers_(forceUpdate, fetchWaitingMembers) {

  const cacheExpirationInSeconds = 21600; //6 timmar
  console.time("Hämta kårens alla medlemmar fetchWaitingMembers-" + fetchWaitingMembers);
  
  const cache = CacheService.getScriptCache();
  
  let kaka;
  let json;
  let extraUrlParam = "";

  if (fetchWaitingMembers)  {
    extraUrlParam = "?waiting=1";
  }

  const nameOfCache = "fetchScoutnetMembers-fetchWaitingMembers-" + fetchWaitingMembers;
  //kaka sätts här för att spara ca 70ms då anropet inte behövs vid forceUpdate
  if (forceUpdate || !(kaka = cache.get(nameOfCache))) {

    const url = 'https://' + KONFIG.SCOUTNET_URL + '/api/' + KONFIG.ORGANISATION_TYPE + '/memberlist' + extraUrlParam;
    json = urlFetch_(url, KONFIG.API_KEY_LIST_ALL);
    //console.log("Json.length " + json.length);

    //Kolla så att inte större än 100kb per kaka och sätt i så fall cache; om ej skippa det.
    //https://developers.google.com/apps-script/reference/cache/cache#put(String,String)
    //100KB ~ 102400 tecken från variabeln json
    //Motsvarar ca 78 medlemmar
    if (json.length < 100000) {
      cache.put(nameOfCache, json, cacheExpirationInSeconds);
      //console.log("Skapa kaka med livslängd " + cacheExpirationInSeconds + " sekunder");
    }
    else {
      //console.log("För stor mängd data för att skapa en kaka");
    }
  }
  else {
    console.log("Kakan för att hämta alla medlemmar fanns redan fetchWaitingMembers-" + fetchWaitingMembers);
    json = kaka;
  }
  
  const data = JSON.parse(json);
  const medlemmar = data.data;
  const allMembers = [];
  
  const variabel_lista_not_lowercase = ['member_no', 'first_name', 'last_name', 'nickname', 'ssno',
                                        'note', 'date_of_birth', 'status',
                                        'created_at', 'confirmed_at', 'group', 'unit', 'patrol', 'unit_role', 'group_role',
                                        'sex', 'address_co', 'address_1', 'address_2' , 'address_3', 'postcode', 'town',
                                        'country', 'contact_mobile_phone', 'contact_home_phone', 'contact_mothers_name',
                                        'contact_mobile_mum', 'contact_telephone_mum', 'contact_fathers_name', 'contact_mobile_dad',
                                        'contact_telephone_dad', 'contact_leader_interest', 'prev_term', 'prev_term_due_date',
                                        'current_term', 'current_term_due_date', 'avatar_updated', 'avatar_url'];
  
  //Dessa attributvärden ska användas som gemener för bättre jämförelser
  const variabel_lista_lowercase = ['email', 'contact_email_mum', 'contact_email_dad', 'contact_alt_email', 'extra_emails'];

  //console.log(medlemmar);
  for (x in medlemmar) {
    const medlem = medlemmar[x];
    const member = setMemberFields_(medlem, variabel_lista_not_lowercase, variabel_lista_lowercase);
    //console.log(member);
    allMembers.push(member);
  }
  console.log("Antal medlemmar " + allMembers.length + " fetchWaitingMembers-" + fetchWaitingMembers)
  console.timeEnd("Hämta kårens alla medlemmar fetchWaitingMembers-" + fetchWaitingMembers);
  return allMembers;
}


/**
 * Om en medlem (dennes member_no) har ett Googlekonto
 * så returnerar vi dennes e-postadress. Annars bara en tom sträng
 *
 * @param {string} member_no - Medlemsnummer för en medlem
 *
 * @returns {string} - E-postadress för medlem om finns, annars tom sträng
 */
function getGoogleAccount_(member_no) {

  const qry = "externalId='"+ member_no +"'";
  let users;

  for (let n = 0; n < 6; n++) {
    if (0 !== n) {
      console.warn("Funktionen getGoogleAcount körs " + n);
    }
    try {
      const page = AdminDirectory.Users.list({
        domain: KONFIG.DOMAIN,
        query: qry,
        orderBy: 'givenName',
        maxResults: 1
      });
      users = page.users;
      if (users) {
        //console.log('%s (%s)', users[0].name.fullName, users[0].primaryEmail);
        return users[0].primaryEmail;
      }
      else {
        //console.log('Inget användarkonto hittades med medlemsnummer ' + member_no);
        return "";
      }
    } catch(e) {
      console.error("Problem med att anropa GoogleTjänst Users.list i funktionen getGoogleAccount");
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Returnerar true eller false om en e-post är en googlegrupp
 *
 * @param {string} email - E-postadress
 *
 * @returns {boolean} - Om e-postadressen är en googlegrupp
 */
function checkIfEmailIsAGroup_(email) {
  
  if (!checkEmailFormat_(email)) {
    return false;
  }
  return checkIfGroupExists_(email); 
}


/**
 * Kontrollerar att formatet på en e-postadress är godkänt
 * genom att se om den innehåller @ och om domännamnet är godkänt
 *
 * @param {string} email - En e-postadress
 *
 * @returns {boolean} - Om e-postadressen är skriven på rätt format
 */
function checkEmailFormat_(email) {
  
  const arr = email.split("@");
  const domain_part = arr[1];
  
  if (domain_part === KONFIG.DOMAIN) {
    return true;
  }
  return false;
}


/**
 * Returnerar true eller false om en googlegrupp finns
 *
 * @param {string} email - E-postadress för en googlegrupp
 *
 * @returns {boolean} - Om gruppen finns eller ej
 */
function checkIfGroupExists_(email) {

  const listOfGroupsToCheckIfGroupExists = getListOfGroups_();

  if (listOfGroupsToCheckIfGroupExists.includes(email)) {
    return true;
  }
  return false;
}


/**
 * Uppdaterar bakgrundsfärgen för en cell.
 * Antingen endast vid behov eller gör det oavsett färg innan.
 * 
 * @param {Object} cell - Ett objekt av typen Range
 * @param {string} colour - Färgen som ska sättas enligt CSS-standard
 * @param {boolean} force - Om färgen ska uppdateras oavsett tidigare färg
 */
function setBackgroundColour_(cell, colour, force) {

  const colourString = colour.toLowerCase();
  let colourCode;

  if ("white" === colourString) {
    colourCode = "#ffffff";
  }
  else {
    colourCode = colour;
    console.log("Denna färg är ej definerad sedan tidigare");
  }

  if (!force && colourCode !== cell.getBackground()) {
    console.log("Ändring av färg för cellen - ej tvingad");
    cell.setBackground(colourCode);
  }
  else if (force) {
    console.log("Ändring av färg för cellen - ej tvingad");
    cell.setBackground(colourCode);
  }
}


/**
 * Hämta data från ett kalkylblad som skriptet är kopplat till
 *
 * @param {string} nameOfSheet - Namn på kalkylbladet
 * 
 * @returns {Object} - Objekt bestående av data från aktuellt kalkylblad
 */
function getDataFromActiveSheet_(nameOfSheet) {

  for (let n = 0; n < 6; n++) {
    if (0 !== n) {
      console.warn("Funktionen getDataFromActiveSheet körs " + n);
    }
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nameOfSheet);
      if (!sheet) {
        console.error("Bladet " + nameOfSheet + " finns ej i kalkylarket");
      }
      const selection = sheet.getDataRange();
      const data = selection.getValues();

      const sheetData = {};
      sheetData["sheet"] = sheet;
      sheetData["selection"] = selection;
      sheetData["data"] = data;

      return sheetData;

    } catch(e) {
      console.error("Problem med att anropa GoogleTjänst SpreadsheetApp");
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


let listOfGroups = [];
/**
 * Ger listan över e-postadresser för grupper
 *
 * @returns {string[]} - Lista över e-postadresser för grupper
 */
function getListOfGroups_() {
  return listOfGroups;
}


/**
 * Uppdaterar listan över e-postadresser för grupper
 */
function updateListOfGroups_() {

  for (let n = 0; n < 6; n++) {
    if (0 !== n) {
      console.warn("Funktionen updateListOfGroups körs " + n);
    }
    try {
      listOfGroups = [];

      let pageToken, page;
      do {
        page = AdminDirectory.Groups.list({
          domain: KONFIG.DOMAIN,
          maxResults: 150,
          pageToken: pageToken
        });
        const groups = page.groups;
        if (groups) {
          for (let i = 0; i < groups.length; i++) {
            listOfGroups.push(groups[i].email);
          }
        }
        else {
          console.info('Inga grupper hittades.');
        }
        pageToken = page.nextPageToken;
      } while (pageToken);

      return listOfGroups;
    
    } catch (e) {
      console.error("Problem med att anropa AdminDirectory.Groups.list i updateListOfGroups");
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Ger ett e-postutkast om det finns givet ämnesraden på det
 * 
 * @param {string} subject - Ämnesrad på e-postutkast
 *
 * @returns {Object} - Ett e-postutkast av typen GmailMessage
 */
function getDraft_(subject) {

  subject = getComparableString_(subject);

  const drafts = GmailApp.getDraftMessages();
  for (let i = 0; i < drafts.length; i++) {

    let draftSubject = drafts[i].getSubject();
    draftSubject = getComparableString_(draftSubject);

    if (draftSubject === subject) {
      //console.log(draftSubject);
      return drafts[i];
    }
  }
  return false;
}


/**
 * Ger vilka e-postadresser som det går att ange som avsändare
 *
 * @returns {string[]} - En lista med e-postadresser
 */
function getAllowedFromEmailAdresses_() {
  
  const aliases = GmailApp.getAliases();
  const my_email = Session.getEffectiveUser().getEmail();
  
  aliases.push(my_email);
  console.log("Tillåtna avsändaradresser " + aliases);
  return aliases;
}


/**
 * Gör om en textsträng till gemener och tar bort tomrum
 * 
 * @param {string} text - Textsträng
 *
 * @returns {string} - Textsträng som är enklare att jämföra
 */
function getComparableString_(text) {

  //Ta bort tomma mellanrum vid start och slut och konvertera till gemener
  text = text.toLowerCase().trim();
  //Ta bort alla tomma mellanrum
  text = text.replace(/([\s])+/g, '');
  return text;
}


/**
 * Tar reda på vilka rader i kalkylarket som ska synkroniseras
 *
 * @param {string} start - Önskad startrad att synkronisera från
 * @param {string} slut - Önskad slutrad att synkronisera till
 * @param {string} maxRowNumber - Maximalt radnummer som går att synkronisera
 *
 * @returns {Object} - Objekt med start- och slutrad att synkronisera
 */
function findWhatRowsToSync_(start, slut, maxRowNumber) {
  
  const minRowStart = 3;
  
  if (typeof start === 'undefined' || start < minRowStart) {
    start = minRowStart; 
  }
  if (typeof slut === 'undefined' || slut > maxRowNumber) {
    slut = maxRowNumber; 
  }
  
  const rowsToSync = {
    "start": start,
    "slut": slut
  };
  return rowsToSync;
}


/**
 * Tar bort kommentarer inom parentes samt tomrum i
 * angiven variabel
 * 
 * @param {string} input - En variabel
 *
 * @returns {string} - En textsträng utan kommentarer eller mellanrum
 */
function getCleanString_(input) {

  input = input.toString(); //Vi gör om till string för att metoden replace ska fungera
  input = input.replace(/\(.*?\)/g, ''); //Ta bort kommentarer inom parentes så de inte kommer med
  input = input.replace(/\s+/g, ''); //Ta bort tomma mellanrum

  return input;
}


/**
 * Ger området för en eller flera kolumner
 *
 * @param {Object} sheet - Ett ark
 * @param {number} columnIndex - Kolumnindex
 * @param {number} numColumns - Antal kolumner med columnIndex längst till vänster
 *
 * @returns {Object} - Området för hela kolumnen
 */
function getA1RangeOfColumns_(sheet, columnIndex, numColumns) {
  
  let range = sheet.getRange(1, columnIndex, 2, numColumns);
  //Vi anger att det ska vara två rader så att vi får en start och slutkolumn
  const a1_cell_row_one = range.getA1Notation();
  
  const a1Notation = a1_cell_row_one.replace(/[0-9]/g, '');
  range = sheet.getRange(a1Notation);
  
  return range;
}


/**
 * Ta bort rader från kalkylbladet
 *
 * @param {Object} sheet - Googleobjekt
 * @param {numbers[]} delete_rows - Lista med villka rader som ska tas bort
 */
function deleteRowsFromSpreadsheet_(sheet, delete_rows) {
  
  for (let k = delete_rows.length-1; k >= 0 ; k--) { //Tar bort rader, starta nerifrån
    
    const rowToDelete = delete_rows[k];
    console.log("Raderat raden " + rowToDelete + " i kalkylarket");
    sheet.deleteRow(rowToDelete);
  }
}


/**
 * Ta bort dubletter från en lista
 * 
 * @param {string[] | number[] | Object[]} - lista
 * 
 * @returns {string[] | number[] | Object[]} - lista
 */
function removeDublicates_(list) {
  const listWithoutDuplicates = []
  
  for (let i = 0; i < list.length; i++) {
    if (!listWithoutDuplicates.includes(list[i])){
      listWithoutDuplicates.push(list[i])
    }
    else {
      //console.log("Hittade dublett av " + list[i]);
    }
  }
  return listWithoutDuplicates;
}


/**
 * Gör strängen till ett svenskt internationellt nummer om möjligt
 * 
 * @param {string} phnum - Ett oformaterat telefonnummer
 * 
 * @returns {string} - Ett telefonnummer skrivet på internationellt vis om möjligt
 */
function intPhoneNumber_(phnum) {

  if ("" === phnum) {
    return "";
  }

  const numPatternOnlyDigits = /[^0-9]+/g;
  phnum = phnum.replace(numPatternOnlyDigits, '');
  //Ta bort alla ickesiffror, mellanslag
  
  const numPatternNoLeadingZeros = /[0]*/;
  phnum = phnum.replace(numPatternNoLeadingZeros, '');
  //Ta bort inledande nollor

  const countryCodes = [];
  countryCodes.push("44"); //Storbritannien
  countryCodes.push("45"); //Danmark
  countryCodes.push("46"); //Sverige
  countryCodes.push("47"); //Norge
  countryCodes.push("358"); //Finland

  for (let i = 0; i < countryCodes.length; i++) {

    if (phnum.startsWith(countryCodes[i]))  {
      //console.log("Telefonnumret tillhör land " + countryCodes[i]);
      return "+" + phnum;
    }
  }

  //Lägg till landskod om ingen finns innan
  return "+46" + phnum;
}


/**
 * Testa om telefonnumret följer E.164 format
 * 
 * @param {string} phnum - Ett oformaterat telefonnummer
 * 
 * @returns {boolean} - Sant eller falskt om korrekt format
 */
function validatePhonenumberForE164_(phnum) {
  const regex = /^\+[1-9]\d{5,14}$/;
  return regex.test(phnum);
}


/**
 * Ersätt specialtecken med deras engelska bokstavsmotsvarigheter
 * https://stackoverflow.com/questions/18123501/replacing-accented-characters-with-plain-ascii-ones
 * 
 * @param {string} str - Textsträng
 * 
 * @returns {string} - Textsträng med endast bokstäver i engelska alfabetet
 */
function removeDiacritics_(str) {

  const defaultDiacriticsRemovalMap = [
    {'base':'A', 'letters':/[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g},
    {'base':'AA','letters':/[\uA732]/g},
    {'base':'AE','letters':/[\u00C6\u01FC\u01E2]/g},
    {'base':'AO','letters':/[\uA734]/g},
    {'base':'AU','letters':/[\uA736]/g},
    {'base':'AV','letters':/[\uA738\uA73A]/g},
    {'base':'AY','letters':/[\uA73C]/g},
    {'base':'B', 'letters':/[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]/g},
    {'base':'C', 'letters':/[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g},
    {'base':'D', 'letters':/[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]/g},
    {'base':'DZ','letters':/[\u01F1\u01C4]/g},
    {'base':'Dz','letters':/[\u01F2\u01C5]/g},
    {'base':'E', 'letters':/[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g},
    {'base':'F', 'letters':/[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]/g},
    {'base':'G', 'letters':/[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]/g},
    {'base':'H', 'letters':/[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]/g},
    {'base':'I', 'letters':/[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g},
    {'base':'J', 'letters':/[\u004A\u24BF\uFF2A\u0134\u0248]/g},
    {'base':'K', 'letters':/[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]/g},
    {'base':'L', 'letters':/[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]/g},
    {'base':'LJ','letters':/[\u01C7]/g},
    {'base':'Lj','letters':/[\u01C8]/g},
    {'base':'M', 'letters':/[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]/g},
    {'base':'N', 'letters':/[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g},
    {'base':'NJ','letters':/[\u01CA]/g},
    {'base':'Nj','letters':/[\u01CB]/g},
    {'base':'O', 'letters':/[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g},
    {'base':'OI','letters':/[\u01A2]/g},
    {'base':'OO','letters':/[\uA74E]/g},
    {'base':'OU','letters':/[\u0222]/g},
    {'base':'P', 'letters':/[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]/g},
    {'base':'Q', 'letters':/[\u0051\u24C6\uFF31\uA756\uA758\u024A]/g},
    {'base':'R', 'letters':/[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]/g},
    {'base':'S', 'letters':/[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]/g},
    {'base':'T', 'letters':/[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]/g},
    {'base':'TZ','letters':/[\uA728]/g},
    {'base':'U', 'letters':/[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g},
    {'base':'V', 'letters':/[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]/g},
    {'base':'VY','letters':/[\uA760]/g},
    {'base':'W', 'letters':/[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]/g},
    {'base':'X', 'letters':/[\u0058\u24CD\uFF38\u1E8A\u1E8C]/g},
    {'base':'Y', 'letters':/[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]/g},
    {'base':'Z', 'letters':/[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]/g},
    {'base':'a', 'letters':/[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g},
    {'base':'aa','letters':/[\uA733]/g},
    {'base':'ae','letters':/[\u00E6\u01FD\u01E3]/g},
    {'base':'ao','letters':/[\uA735]/g},
    {'base':'au','letters':/[\uA737]/g},
    {'base':'av','letters':/[\uA739\uA73B]/g},
    {'base':'ay','letters':/[\uA73D]/g},
    {'base':'b', 'letters':/[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/g},
    {'base':'c', 'letters':/[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g},
    {'base':'d', 'letters':/[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]/g},
    {'base':'dz','letters':/[\u01F3\u01C6]/g},
    {'base':'e', 'letters':/[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g},
    {'base':'f', 'letters':/[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/g},
    {'base':'g', 'letters':/[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/g},
    {'base':'h', 'letters':/[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/g},
    {'base':'hv','letters':/[\u0195]/g},
    {'base':'i', 'letters':/[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g},
    {'base':'j', 'letters':/[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/g},
    {'base':'k', 'letters':/[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/g},
    {'base':'l', 'letters':/[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/g},
    {'base':'lj','letters':/[\u01C9]/g},
    {'base':'m', 'letters':/[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/g},
    {'base':'n', 'letters':/[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g},
    {'base':'nj','letters':/[\u01CC]/g},
    {'base':'o', 'letters':/[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g},
    {'base':'oi','letters':/[\u01A3]/g},
    {'base':'ou','letters':/[\u0223]/g},
    {'base':'oo','letters':/[\uA74F]/g},
    {'base':'p','letters':/[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/g},
    {'base':'q','letters':/[\u0071\u24E0\uFF51\u024B\uA757\uA759]/g},
    {'base':'r','letters':/[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/g},
    {'base':'s','letters':/[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/g},
    {'base':'t','letters':/[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/g},
    {'base':'tz','letters':/[\uA729]/g},
    {'base':'u','letters':/[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g},
    {'base':'v','letters':/[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/g},
    {'base':'vy','letters':/[\uA761]/g},
    {'base':'w','letters':/[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/g},
    {'base':'x','letters':/[\u0078\u24E7\uFF58\u1E8B\u1E8D]/g},
    {'base':'y','letters':/[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/g},
    {'base':'z','letters':/[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/g}
  ];

  for (let i = 0; i < defaultDiacriticsRemovalMap.length; i++) {
    str = str.replace(defaultDiacriticsRemovalMap[i].letters, defaultDiacriticsRemovalMap[i].base);
  }
  return str;
}
