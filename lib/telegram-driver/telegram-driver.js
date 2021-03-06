'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeTelegramDriver = makeTelegramDriver;

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _sources = require('./sources');

var _apiRequest = require('./api-request');

var _types = require('./types/types');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function makeEventsSelector(sources) {
  return function events(eventName) {
    var messageSources = {
      'message': sources.message.share()
    };

    var inlineQuerySources = {
      'inline_query': sources.inlineQuery.share(),
      'chosen_inline_result': sources.chosenInlineResult.share()
    };

    var callbackQuerySources = {
      'callback_query': sources.callbackQuery.share()
    };

    // return interface
    return _rx2.default.Observable.case(function () {
      return eventName;
    }, Object.assign({}, messageSources, inlineQuerySources, callbackQuerySources));
  };
}

function makeTelegramDriver(token, webHook) {
  var proxy = webHook ? (0, _sources.makeWebHook)(token, webHook) : (0, _sources.makeUpdates)(token);
  var updates = proxy.doOnError(function (err) {
    return console.log('Updates Error', err);
  }).replay(null, 1);

  var sources = (0, _sources.makeSources)(updates);
  var disposable = updates.connect();

  return function telegramDriver(request) {
    // pass request
    request.mergeAll().filter(_types.Request.is).flatMap(function (_ref) {
      var method = _ref.method;
      var query = _ref.options;
      return (0, _apiRequest.makeAPIRequest)({ token: token, method: method, query: query });
    }).subscribe(function (msg) {
      return console.log(_chalk2.default.bold('sent message'));
    }, function (err) {
      return console.log('onError', err);
    });

    // return interface
    return {
      observable: updates,
      events: makeEventsSelector(sources),
      dispose: function dispose() {
        return disposable.dispose();
      }
    };
  };
}