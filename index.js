var Promise = require('bluebird');

/**
 * @param {Object}              [query={}]
 * @param {Object}              [options={}]
 * @param {Object|String}         [options.select]
 * @param {Object|String}         [options.sort]
 * @param {Array|Object|String}   [options.populate]
 * @param {Boolean}               [options.lean=false]
 * @param {Boolean}               [options.normalizeId=false]
 * @param {Boolean}               [options.privateFields=[]]
 * @param {Number}                [options.page=1]
 * @param {Number}                [options.size=10]
 * @param {Number}                [options.maxSize=100]
 * @param {Function}            [callback]
 *
 * @returns {Promise}
 */
function paginate(query, options, callback) {
    query   = query || {};
    options = Object.assign({}, paginate.options, options);

    var select        = options.select;
    var sort          = options.sort;
    var populate      = options.populate;
    var lean          = options.lean || false;
    var normalizeId   = options.normalizeId || false;
    var privateFields = options.privateFields || [];

    var page    = options.hasOwnProperty('page') ? Number(options.page) : 1;
    var size    = options.hasOwnProperty('size') ? Number(options.size) : 10;
    var maxSize = options.hasOwnProperty('maxSize') ? Number(options.maxSize) : 100;

    if(size > maxSize) {
        size = maxSize;
    }

    var promises = {
        docs:  Promise.resolve([]),
        count: this.count(query).exec()
    };

    if(privateFields.length && select) {
        privateFields.forEach(function(field) {
            if(select && select.indexOf(field) !== -1) {
                select = select.replace(field, '|' + field + '|');
            }
        });
    }

    if(privateFields.length && (!select || select.indexOf('-') !== -1)) {
        var tempSelect = '';
        privateFields.forEach(function(field) {
            tempSelect += ' -' + field;
        });
        select = select ? (select + tempSelect) : tempSelect;
    }

    if(select && normalizeId && select.indexOf('id') !== -1) {
        select = select.replace('id', '_id');
    }

    if(select && select.indexOf('-') === -1 && select.indexOf('_id') === -1) {
      select += ' -_id';
    }

    var query = this.find(query)
        .select(select)
        .sort(sort)
        .skip((page - 1) * size)
        .limit(size)
        .lean(lean)
    ;

    if (populate) {
        [].concat(populate).forEach(function(item) {
            query.populate(item);
        });
    }

    promises.docs = query.exec();

    if (lean && normalizeId) {
        promises.docs = promises.docs.then(function(docs) {
            docs.forEach(function(doc) {
                if(normalizeId && doc._id) {
                  doc.id = String(doc._id);
                  delete doc._id;
                }
            });

            return docs;
        });
    }

    return Promise.props(promises)
        .then(function(data) {
            return result = {
                page: page,
                size: size,
                totalElements: data.count,
                totalPages: Math.ceil(data.count / size) || 1,
                content:  data.docs,
            };
        })
        .asCallback(callback)
    ;
}

/**
 * @param {Schema} schema
 */
module.exports = function(schema) {
    schema.statics.paginate = paginate;
};

module.exports.paginate = paginate;
