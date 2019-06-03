const fs = require('fs');
const path = require('path');

const ObjectsToCsv = require('objects-to-csv');
const csvToObject = require('csvtojson');

if (process.argv.length < 3) {
    console.log("type parameter is required.");
    process.exit(-1);
}
const type = process.argv[2];
const inputPath = '.' + path.sep + 'input' + path.sep + type;
const outputPath = '.' + path.sep + 'output' + path.sep + type;

//product

const ProductType = {
    SIMPLE: 'simple',
    VIRTUAL: 'virtual',
    CONFIGURABLE: 'configurable',
    BUNDLE: 'bundle',
    GIFT_VOUCHER: 'gift_voucher',
};
let regURL = new RegExp(/[^0-9a-z]+/g);

// category
let rawData = fs.readFileSync('src/category.json');
const categoryJson = JSON.parse(rawData);
const nonInventoryCats = [
    'Non stock Rental',
    'Non-Inventory',
    'Non Inventory'
];

function findCategoryPath(path) {
    let categoryPaths = [];
    const pathIds = path.split('/');

    pathIds.forEach((catId, index) => {
        if (!index) {
            return;
        }
        if (index === 2) {
            categoryPaths.push(`Default Category/${categoryJson[catId]['name']}`);
            return;
        }

        if (index === 3) {
            categoryPaths.push(`Default Category/${categoryJson[pathIds[2]]['name']}/${categoryJson[catId]['name']}`);
            return;
        }

        if (index === 4) {
            categoryPaths.push(`Default Category/${categoryJson[pathIds[2]]['name']}/${categoryJson[pathIds[3]]['name']}/${categoryJson[catId]['name']}`);
            return;
        }
        return;
    });
    return categoryPaths;
}

const mapService = {
    barcodes: (row) => {
        let SKU = row[' Item Number'];

        let supplierSku = row[' Supplier Part Number'];
        if ((!SKU || SKU.length) && supplierSku) {
            SKU = supplierSku;
        }

        let BARCODE = row[' Part Number'];
        if (!BARCODE ) {

        }
        let QTY = 1;
        let SUPPLIER = '';
        let PURCHASE_TIME = '';
        return {
            SKU,BARCODE,QTY,SUPPLIER,PURCHASE_TIME
        }
    },
    stock_sources: (row, index, source_code) => {
        let sku = row[' Item Number'];
        let supplierSku = row[' Supplier Part Number'];
        if ((!sku || sku.length) && supplierSku) {
            sku = supplierSku;
        }

        let quantity = parseFloat(row['In Stock']);
        let status = quantity > 0 ? 1 : 0;
        return {
            source_code,
            sku,
            status,
            quantity,
        }
    },
    catalog_products: (row, index) => {
//sku,store_view_code,attribute_set_code,product_type,categories,product_websites,name,description,short_description,
// weight,product_online,tax_class_name,visibility,price,special_price,special_price_from_date,special_price_to_date,
// url_key,meta_title,meta_keywords,meta_description,created_at,updated_at,new_from_date,new_to_date,
// display_product_options_in,map_price,msrp_price,map_enabled,gift_message_available,custom_design,custom_design_from,
// custom_design_to,custom_layout_update,page_layout,product_options_container,msrp_display_actual_price_type,
// country_of_manufacture,additional_attributes,qty,out_of_stock_qty,use_config_min_qty,is_qty_decimal,allow_backorders,
// use_config_backorders,min_cart_qty,use_config_min_sale_qty,max_cart_qty,use_config_max_sale_qty,is_in_stock,
// notify_on_stock_below,use_config_notify_stock_qty,manage_stock,use_config_manage_stock,use_config_qty_increments,
// qty_increments,use_config_enable_qty_inc,enable_qty_increments,is_decimal_divided,website_id,deferred_stock_update,
// use_config_deferred_stock_update,related_skus,crosssell_skus,upsell_skus,hide_from_product_page,custom_options,
// bundle_price_type,bundle_sku_type,bundle_price_view,bundle_weight_type,bundle_values,associated_skus

        //sku,Default,simple,"Default Category/Gear,Default Category/Gear/Fitness Equipment",base,Sprite Yoga Strap 6 foot,
        // "Description",,1,1,Taxable Goods,"Catalog, Search",14,,,,sprite-yoga-strap-6-foot,Meta Title,"meta1, meta2, meta3"
        // ,meta description,"2015-10-25 03:34:20","2015-10-25 03:34:20",,,Block after Info Column,,,,,,,,,,,Use config,,
        // "has_options=1,quantity_and_stock_status=In Stock,required_options=0",100,0,1,0,0,1,1,0,0,1,1,,1,0,1,1,0,1,0,0,1,0,1,
        // "24-WG087,24-WG086","24-WG087,24-WG086","24-WG087,24-WG086",
        // ,"name=Custom Yoga Option,type=drop_down,required=0,price=10.0000,price_type=fixed,sku=,option_title=Gold|name=Custom Yoga Option,type=drop_down,required=0,price=10.0000,price_type=fixed,sku=,option_title=Silver|name=Custom Yoga Option,type=drop_down,required=0,price=10.0000,price_type=fixed,sku=yoga3sku,option_title=Platinum",,,,,,
        let sku = row[' Item Number'];
        let supplierSku = row[' Supplier Part Number'];

        if ((!sku || sku.length) && supplierSku) {
            sku = supplierSku;
        }

        let product_type = ProductType.SIMPLE;

        let categoryPaths = [];
        const Main = row['Main'];
        const Cat = row['Cat'];

        let $theoryCat = Object.values(categoryJson).find(category => {
            return category['meta_description'] === Cat;
        });

        if ($theoryCat) {
            categoryPaths = categoryPaths.concat(findCategoryPath($theoryCat.path));
            if (nonInventoryCats.includes($theoryCat['name'])) {
                product_type = ProductType.VIRTUAL;
            }
        }

        let $mainCat = Object.values(categoryJson).find(category => {
            return category['name'] === Main;
        });

        if ($mainCat) {
            categoryPaths = categoryPaths.concat(findCategoryPath($mainCat.path));
            if (nonInventoryCats.includes($mainCat['name'])) {
                product_type = ProductType.VIRTUAL;
            }
        }

        let categories = '';

        if (categoryPaths.length) {
            categories = categoryPaths.join(',');
        }

        let name = row[' Description'];

        if (sku && (!name || !name.length)) {
            name = sku;
        }

        if (name && (!sku || !sku.length)) {
            sku = name.replace(regURL, '-').toLowerCase();
        }

        let description = row[' Descript 2'];
        let sizeDescription = [];

        if (row['Size 1']) {
            sizeDescription.push(`Size1: ${row['Size 1']}`);
        }

        if (row['Size 2']) {
            sizeDescription.push(`Size2: ${row['Size 2']}`);
        }

        if (row['Size 3']) {
            sizeDescription.push(`Size3: ${row['Size 3']}`);
        }

        if (sizeDescription.length) {
            description += sizeDescription.join(', ')
        }

        let price = row['List'].replace(/\$|\(|\)|-|,/g, "") * 1;
        price = Math.abs(price);
        let qty = row['In Stock'].replace(/,/g,'');
        let brand = row[' Brand'];
        let url_key  = name.replace(regURL, '-') + `-${index}`.toLowerCase();
        let additional_attributes = `has_options=0,quantity_and_stock_status=In Stock,required_options=0`;

        if (brand.length) {
            additional_attributes += `,brand=${brand}`;
        }

        return {
            sku,
            store_view_code: '',
            attribute_set_code: 'Default',
            product_type,
            categories,
            product_websites: 'base',
            name,
            description,
            short_description: description,
            weight: product_type === ProductType.VIRTUAL ? 0 : 1,
            product_online: 1,
            tax_class_name: "Taxable Goods",
            visibility: "Catalog, Search",
            price,
            special_price: '',
            special_price_from_date: '',
            special_price_to_date: '',
            url_key, 
            meta_title: '',meta_keywords: '',meta_description: '',created_at: '',updated_at: '',new_from_date: '',
            new_to_date: '', display_product_options_in: 'Block after Info Column',map_price: '',msrp_price: '',
            map_enabled: '',gift_message_available: '',custom_design: '',custom_design_from: '', custom_design_to: '',
            custom_layout_update: '',page_layout: '',product_options_container: '', msrp_display_actual_price_type: 'Use config',
            country_of_manufacture: '', additional_attributes,
            qty,
            out_of_stock_qty: 0,
            use_config_min_qty:1,
            is_qty_decimal:0,
            allow_backorders:0,
            use_config_backorders:1,
            min_cart_qty:1,
            use_config_min_sale_qty:0,
            max_cart_qty:0,
            use_config_max_sale_qty:1,
            is_in_stock:1,
            notify_on_stock_below:'',
            use_config_notify_stock_qty:1,
            manage_stock:0,
            use_config_manage_stock:1,
            use_config_qty_increments:1,//
            qty_increments:0,
            use_config_enable_qty_inc:1,
            enable_qty_increments:0,
            is_decimal_divided:0,
            website_id:1,
            deferred_stock_update:0,
            use_config_deferred_stock_update:1,
            related_skus:'',crosssell_skus:'',upsell_skus:'',hide_from_product_page:'',custom_options:'',
            bundle_price_type:'',bundle_sku_type:'',bundle_price_view:'',bundle_weight_type:'',bundle_values:'',
            associated_skus:''
        }
    },
};

fs.readdir(inputPath, function (err, items) {
    items.forEach(csvFile => {
        (async () => {
            let fullPath = inputPath + path.sep + csvFile;
            const source_code = csvFile.includes('KN') ? 'default' : 'cedarpoint';

            const jsonArray = await csvToObject().fromFile(fullPath);

            let rows = Object.values(jsonArray).map((row, index) => {
               return mapService[type](row, index, source_code)
            });

            let csv = new ObjectsToCsv(rows);
            // Save to file:
            await csv.toDisk(outputPath + path.sep + csvFile);
        })();
    })
});
