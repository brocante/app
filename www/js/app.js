angular.module('starter', [
    'ionic',
    'starter.controllers',
    'starter.filters',
    'starter.services',
    'starter.directives',
    'ngCordova',
    'firebase',
    'ui.router',
    'jrCrop'
])

    .run(function($ionicPlatform, Location, Auth, $ionicLoading, $location, $rootScope, DB) {
        $ionicPlatform.ready(function() {
            if(window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
            }

            if(window.StatusBar) {
                StatusBar.styleLightContent();
            }

            Location.update();

            Auth.$onAuth(function(authData) {
                $rootScope.tryAuth = true;

                if(authData) {

                    // if current path is login, redirect to products
                    if($location.path() === '/login') {
                        $location.path('/tab/products');
                    }

                    DB.users.child(authData.uid).once('value', function(snap) {
                        $rootScope.currentUser = snap.val();
                    });

                } else {
                    console.log("Logged out");
                    $rootScope.currentUser = {};
                    $ionicLoading.hide();
                    $location.path('/login');
                }
            });

            $rootScope.logout = function() {
                console.log("Logging out from the app");

                $ionicLoading.show({
                    template: 'Logging Out...'
                });

                Auth.$unauth();
            };


            $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error) {
                if(error === 'AUTH_REQUIRED') {
                    $location.path('/login');
                }
            });
        });
    })

    .config(function($stateProvider, $urlRouterProvider, $cordovaFacebookProvider) {

        //cordova -d plugin add /Users/yannlombard/test/phonegap-facebook-plugin --variable APP_ID="1459559780935638" --variable APP_NAME="Brocante"

        if (window.cordova && window.cordova.platformId === 'browser') {
            var appID = 1459559780935638;
            $cordovaFacebookProvider.browserInit(appID);
            // version is optional. It refers to the version of API you may want to use.
        }

        $stateProvider

            .state('login', {
                url        : '/login',
                templateUrl: 'templates/login.html',
                controller : 'LoginCtrl',
                resolve    : {
                    currentAuth: ['Auth', function(Auth) {
                        return Auth.$waitForAuth();
                    }]
                }
            })

            .state('tab', {
                url        : '/tab',
                abstract   : true,
                templateUrl: 'templates/tabs.html',
                resolve    : {
                    currentAuth: ['Auth', function(Auth) {
                        return Auth.$requireAuth();
                    }]
                }
            })

            .state('tab.products', {
                url  : '/products',
                views: {
                    'tab-products': {
                        templateUrl: 'templates/tab-products.html',
                        controller : 'ProductsCtrl'
                    }
                }
            })

            .state('tab.account', {
                url  : '/account',
                views: {
                    'tab-account': {
                        templateUrl: 'templates/tab-account.html',
                        controller : 'AccountCtrl'
                    }
                }
            })

            .state('tab.product', {
                url  : '/product/:productId',
                views: {
                    'tab-products': {
                        templateUrl: 'templates/product.html',
                        controller : 'ProductCtrl'
                    }
                }
            })

            .state('tab.photo', {
                url  : '/photo',
                views: {
                    'tab-photo': {
                        templateUrl: 'templates/tab-photo.html',
                        controller : 'PhotoCtrl'
                    }
                }
            });

        $urlRouterProvider.otherwise('/login');

    });
