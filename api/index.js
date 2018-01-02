'use strict';

const Hapi = require('hapi');
const mongoose = require('mongoose');
mongoose.connect('mongodb://mongo/lint');
mongoose.Promise = global.Promise;

const LintResult = mongoose.model('LintResult', {
    _id: { type: String, required: true },
    result: { type: Array, required: true},
    updated_tms: { type: Date, default: Date.now }
});

const server = Hapi.server({
    port: 8000
});

server.route([
    {
        method: 'GET',
        path: '/results',
        handler: async function(request, h) {
            try {
                const results = await LintResult.find();
                return results;
            } catch (err) {
                return err;
            }
        }
    },
    {
        method: 'GET',
        path: '/results/{uri*}',
        handler: async function(request, reply) {
            try {
                const results = await LintResult.findOne({ _id: request.params.uri });
                return results;
            } catch(err) {
                return err;
            }
        }
    }
]);


/*
 * Start the server
 */
server.start((err) => {
    if(err) {
        throw err;
    } else {
        console.log(`Server running at: ${server.info.uri}`);
    }
});
