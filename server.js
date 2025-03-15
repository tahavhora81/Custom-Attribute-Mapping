require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const Together = require('together-ai');

const fs =require('fs');

const app =express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const client = new Together({
    apiKey: process.env['TOGETHER_API_KEY'] // The API key is not provided in .env file for security reasons
});

app.get('/', (req,res)=>{
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

var prompt = "For the provided invoice return the following attributes in a json. Only provide the JSON and no other text. Directly start with the JSON in the response. The attributes and their names in the JSON are as follows: Invoice number: inv_no , Invoice date: inv_date, Customer name (bill to): cust_name, billing address: bill_address, , total (final total) : total, tax (amount, not percentage, can be GST, VAT, IGST, CGST, SGST) : tax (if not mentioned then 0), Due date: due_date, items List with name 'items' containing item name: item_name, quantity : qty, unit price: unit_price, quantity : qty . If anything is not available then write 'NaN' in front of it. Provide dates is DD-MM-YYYY format. In invoice number only provide numbers and no text. Provide all values in quotatation marks. Do not add tax or discount as items. Close the JSON with }";

var prev;
var img_name;
var image_no;
var model_name;
var img_ext;
var img_path;
var img_simple;
app.post('/submit', async (req, res)=>{
    image_no = req.body.image_no;
    img_name = image_no;
    model_name = req.body.select_model;
    img_ext = req.body.img_extension;
    img_simple = 'images/' + image_no + img_ext;
    console.log(img_simple);
    img_path = 'C:/Users/Admin/Desktop/Taha/IDP Phase 2 Taha/Attribute Mapping - Custom Attribute/public/images/';
    img_path = img_path + image_no + img_ext;
    const finalImageUrl = isRemoteFile(img_path)
    ? img_path
    : `data:image/jpeg;base64,${encodeImage(img_path)}`;

    const chatCompletion = await client.chat.completions.create({
        messages:[
            
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": finalImageUrl,
                        },
                    },
                ],
            }
        ],
            model : model_name,
            temperature : 0.3,
    });

    let op = await chatCompletion.choices[0].message.content;
    console.log(op);
    let i=0;
    while(i<op.length && op[i]!= '{'){
        i++;
    }
    op = op.substring(i);
    i=op.length - 1;
    while(op[i] != '}'){
        i--;
    }
    op = op.substring(0, i+1);
    console.log(op);
    op = JSON.parse(op);
    console.log(op);
    /*
    const csv = `${img_name},${prev.inv_no},${prev.inv_date},${prev.cust_name},"${prev.bill_address}",${prev.total},${prev.tax},${prev.due_date}\n`;
    try {
      fs.appendFileSync(path.join(__dirname, 'public', 'meta_test_invoice_ds.csv'), csv);
    } catch (err) {
      console.error(err);
    }

    for(let i=0; i<prev.items.length; i++){
        const csv = `${img_name},${i},${prev.items[i].item_name},${prev.items[i].qty},${prev.items[i].unit_price}\n`;
        try {
        fs.appendFileSync(path.join(__dirname, 'public', 'meta_test_invoice_items_ds.csv'), csv);
        } catch (err) {
        console.error(err);
        }
    }

    */
    res.render(path.join(__dirname, 'views', 'index.ejs'), {img_prev_path : img_simple, data : op});
});


app.post('/enter', async (req,res)=>{
    const finalImageUrl = isRemoteFile(img_path)
    ? img_path
    : `data:image/jpeg;base64,${encodeImage(img_path)}`;

    let custom_keys = req.body.custom;
    let custom_desc = req.body.custom_desc;

    let str1= "";
    if(!custom_keys){
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }

    for(let i=0; i<custom_keys.length; i++){
        str1= str1 + "Key name:" + custom_keys[i] + " Description: " + custom_desc[i]; 
    }

    str1 = `From the provided invoice, return the keys and values in JSON format like {custom_list: [{name: key name, 'value': Extracted value}, {}]}. The keys are ${str1}, Directly start with the JSON and no other text at all. Strictly follow the format.`
    const chatCompletion = await client.chat.completions.create({
        messages:[
            
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": str1},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": finalImageUrl,
                        },
                    },
                ],
            }
        ],
            model : model_name,
            temperature : 0.3,
    });

    let custom1 = await chatCompletion.choices[0].message.content;
    console.log(custom1);
    let i=0;
    while(i<custom1.length && custom1[i]!= '{' && custom1[i] !='['){
        i++;
    }

    if(custom1[i] == '['){
        custom1 = custom1.substring(i, custom1.length );
        custom1 = `{"custom_list" :` + custom1 ;
    }else{
        custom1 = custom1.substr(i);
    }

    i=custom1.length - 1;
    while(custom1[i] != '}' && custom1[i] != ']'){
        i--;
    }
    if(custom1[i] == ']'){
        custom1 = custom1.substr(0, i+1) + "}";
    }
    else{
            custom1 = custom1.substring(0, i+1);
    }
    console.log(custom1);
    custom1 = JSON.parse(custom1);
    console.log(custom1);
    let curr ={
        inv_no : req.body.inv_no, 
        inv_date : req.body.inv_date,
        cust_name: req.body.cust_name, 
        bill_address : req.body.bill_address,
        total : req.body.total,
        tax : req.body.tax,
        due_date : req.body.due_date, 
        items: []
    }

    for(let i=0; i< req.body.item_name.length; i++){
        curr.items.push({item_name: req.body.item_name[i], qty: req.body.item_qty[i], unit_price: req.body.unit_price[i]});
    }
    /*
    const csv = `${img_name},${curr.inv_no},${curr.inv_date},${curr.cust_name},"${curr.bill_address}",${curr.total},${curr.tax},${curr.due_date}\n`;
    try {
      fs.appendFileSync(path.join(__dirname, 'public', 'invoice_ds.csv'), csv);
    } catch (err) {
      console.error(err);
    }

    for(let i=0; i<curr.items.length; i++){
        const csv = `${img_name},${i},${curr.items[i].item_name},${curr.items[i].qty},${curr.items[i].unit_price}\n`;
        try {
        fs.appendFileSync(path.join(__dirname, 'public', 'invoice_items_ds.csv'), csv);
        } catch (err) {
        console.error(err);
        }
    }
    */
    /*
    let result ={items : []};
    let checker = true;
    if(prev.inv_no == curr.inv_no){
        result.inv_no_result = "Yes";
    }
    else{
        result.inv_no_result = "No";
        checker = false;
    }

    if(prev.inv_date == curr.inv_date){
        result.inv_date_result = "Yes";
    }
    else{
        result.inv_date_result = "No";
        checker = false;
    }

    if(prev.cust_name == curr.cust_name){
        result.cust_name_result = "Yes";
    }
    else{
        resultcust_name_result = "No";
        checker = false;
    }

    if(prev.bill_address == curr.bill_address){
        result.bill_address_result = "Yes";
    }
    else{
        result.bill_address_result = "No";
        checker = false;
    }

    if(prev.total == curr.total){
        result.total_result = "Yes";
    }
    else{
        result.total_result = "No";
        checker = false;
    }

    if(prev.tax == curr.tax){
        result.tax_result = "Yes";
    }
    else{
        result.tax_result = "No";
        checker = false;
    }

    if(checker){
        result.overall = "Yes";
    }   
    else{
        result.overall = "No";
    } */

    
    res.render(path.join(__dirname, 'views', 'next_page.ejs'), {img_prev_path : img_simple, data: curr, custom1: custom1});
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server is running on port 3000.");
});


function encodeImage(imagePath) {
    const imageFile = fs.readFileSync(imagePath);
    return Buffer.from(imageFile).toString("base64");
}
  
function isRemoteFile(filePath)  {
    return filePath.startsWith("http://") || filePath.startsWith("https://");
}