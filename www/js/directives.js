angular.module('starter.directives', [])
    .directive('broLoader', function() {
        return {
            replace    : true,
            templateUrl: 'templates/directives/bro-loader.html'
        };
    });