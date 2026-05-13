export var colorCamels = ["red", "blue", "purple", "yellow", "green"];
export var bwCamels = ["black", "white"];

export function isColorCamel(color) {
  return colorCamels.includes(color);
}

export function getCamelPositionAndStack(track, color) {
  for (var i = 0; i < Object.keys(track).length; i++) {
    if (track[i]["camels"].includes(color)) {
      var camelIndex = track[i]["camels"].indexOf(color);
      var camelsToMove = track[i]["camels"].slice(camelIndex);
      return [i, camelsToMove];
    }
  }
  return [-1, null];
}

export function pickBlackOrWhiteCamel(track, rolledDiceColor) {
  var [blackPosition, blackCamelsToMove] = getCamelPositionAndStack(
    track,
    "black"
  );
  var [whitePosition, whiteCamelsToMove] = getCamelPositionAndStack(
    track,
    "white"
  );

  var camelColor = null;
  if (blackCamelsToMove.length === 1) {
    if (whiteCamelsToMove.length === 1) {
      camelColor = rolledDiceColor;
    } else if (whiteCamelsToMove[1] === "black") {
      camelColor = "black";
    } else {
      camelColor = "white";
    }
  } else {
    if (whiteCamelsToMove.length === 1) {
      if (blackCamelsToMove[1] === "white") {
        camelColor = "white";
      } else {
        camelColor = "black";
      }
    } else {
      if (blackCamelsToMove[1] === "white") {
        camelColor = "white";
      } else if (whiteCamelsToMove[1] === "black") {
        camelColor = "black";
      } else {
        camelColor = rolledDiceColor;
      }
    }
  }
  return camelColor;
}

export function moveCamel(track, color, position, newPosition, placeUnder) {
  var camelIndex = track[position]["camels"].indexOf(color);
  var camelsToMove = track[position]["camels"].slice(camelIndex);
  track[position]["camels"] = track[position]["camels"].slice(0, camelIndex);

  if (newPosition != null) {
    if (!placeUnder) {
      track[newPosition]["camels"] = track[newPosition]["camels"].concat(
        camelsToMove
      );
    } else {
      track[newPosition]["camels"] = camelsToMove.concat(
        track[newPosition]["camels"]
      );
    }
  }

  return camelsToMove;
}

export function cloneTrack(track) {
  const t = {};
  for (const k of Object.keys(track)) {
    t[k] = { camels: [...track[k].camels], tiles: [...track[k].tiles] };
  }
  return t;
}
