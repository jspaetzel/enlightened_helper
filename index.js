const Alexa = require('ask-sdk-core');

// --------------- Functions that do stuff -----------------------
var EPOCH = 1389150000000;
var CYCLE_LENGTH = 630000000;
var CHECKPOINT_LENGTH = 18000000;
var UTC = true;
var currentCycle;

function calcCycle(cycle) {
    var start = new Date();
    var now = start.getTime();
    var cycleDisplay = cycle+1;
    start.setTime(EPOCH + (cycle*CYCLE_LENGTH));
    var year = 2018;
    start.setTime(start.getTime()+CHECKPOINT_LENGTH); // No measurement is taken until the first checkpoint after rollover.
    var checkpoints = [];
    for (var i=0;i<35;i++) {
        var next = isNext(start, now);
        checkpoints[i] = {
            date: new Date(start),
            classes: (next ? 'next' : (start.getTime() < now ? 'past' : 'upcoming')) + (i==34 ? ' final' : ''),
            next: next
        };
        start.setTime(start.getTime()+CHECKPOINT_LENGTH);
    }
    if (year > 2014) {
        var yearEnd = new Date(year-1, 11, 31, 23, 59);
        var lastCycle = Math.floor((yearEnd.getTime() - EPOCH) / CYCLE_LENGTH);
        cycleDisplay = cycle - lastCycle;
    }
    if (cycleDisplay < 10) {
        cycleDisplay = '0'+cycleDisplay;
    }
    return {cycle: year+'.'+(cycleDisplay), checkpoints:checkpoints, current:(cycle == currentCycle)};
}

function isNext(start, now) {
	return (start.getTime() > now && (now + CHECKPOINT_LENGTH) > start.getTime());
}

function format(dateRemaining) {
    var now = new Date();
    var diff = dateRemaining - now; // miliseconds between
    console.log("Diff: " + JSON.stringify(diff));
    var seconds = Math.floor(diff/1000);
    var minutes = Math.floor(seconds/60);
    var hours = Math.floor(minutes/60);
    var days = Math.floor(hours/24);

    hours = hours-(days*24);
    minutes = minutes-(days*24*60)-(hours*60);
    seconds = seconds-(days*24*60*60)-(hours*60*60)-(minutes*60);
        
    var message = '';
    if (days >= 1) {
        message += days + ' days, ';
    }
    if (hours >= 1) {
        message += hours + ' hours, ';
    }
    if (minutes >= 1) {
        message += minutes + ' minutes, ';
    }
    message += seconds + ' seconds';
    return message;
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = 'Welcome to the Enlightened Helper skill. Ask me about the next checkpoint!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  }
};

const GetCheckpointIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetCheckpointIntent';
  },
  handle(handlerInput) {
      var cycle = currentCycle = Math.floor((new Date().getTime() - EPOCH) / CYCLE_LENGTH);
    var data = calcCycle(cycle);

    var nextCheckpoint = {};
    for (var i = 0; i < data.checkpoints.length; i++) {
        if (data.checkpoints[i].next === true){
            nextCheckpoint = data.checkpoints[i];
        }
    }
    console.log("Next: " + JSON.stringify(nextCheckpoint));
    
    var message = format(nextCheckpoint.date);

    return handlerInput.responseBuilder
      .speak(message)
      .getResponse();
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can ask me about the upcoming checkpoint';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  }
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
        || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Goodbye!', speechText)
      .withShouldEndSession(true)
      .getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    // Any clean-up logic goes here.
    return handlerInput.responseBuilder.getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I don\'t understand your command. Please say it again.')
      .reprompt('Sorry, I don\'t understand your command. Please say it again.')
      .getResponse();
  }
};

let skill;

exports.handler = async function (event, context) {
  console.log(`REQUEST++++${JSON.stringify(event)}`);
  if (!skill) {
    skill = Alexa.SkillBuilders.custom()
      .addRequestHandlers(
        LaunchRequestHandler,
        GetCheckpointIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
      )
      .addErrorHandlers(ErrorHandler)
      .create();
  }

  const response = await skill.invoke(event, context);
  console.log(`RESPONSE++++${JSON.stringify(response)}`);

  return response;
};