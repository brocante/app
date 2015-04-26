angular.module('starter.filters', [])

    .filter('formatDistance', function() {
        return function(distance) {
            var formatted;

            if(distance > 1) {
                formatted = parseInt(Math.round(distance)) + ' km';
            } else {
                formatted = parseInt(Math.round(distance * 1000)) + ' m';
            }
            return formatted;
        }
    });
