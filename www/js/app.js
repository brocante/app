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

    .run(function($ionicPlatform, Location, Auth, $ionicLoading, $location, $rootScope, DB, Products, User) {
        $ionicPlatform.ready(function() {
            if(window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
            }

            if(window.StatusBar) {
                StatusBar.styleLightContent();
            }

            Location.update().then(function(location) {
                $rootScope.currentLocation = location;
                Products.setLocation();
            });

            Auth.$onAuth(function(authData) {
                $rootScope.tryAuth = true;

                if(authData) {
                    User.get(authData).then(function() {
                        Products.setLocation();

                        // if current path is login, redirect to products
                        if($location.path() === '/login') {
                            $location.path('/tab/products');
                        }
                    });

                } else {
                    console.log("Logged out");
                    $rootScope.currentUser = null;
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

    .config(function($stateProvider, $urlRouterProvider, $cordovaFacebookProvider, $ionicConfigProvider) {
        $ionicConfigProvider.views.maxCache(0);

        //cordova -d plugin add /Users/yannlombard/test/phonegap-facebook-plugin --variable APP_ID="1459559780935638" --variable APP_NAME="Brocante"

        if(window.cordova && window.cordova.platformId === 'browser') {
            var appID = 1459559780935638;
            $cordovaFacebookProvider.browserInit(appID);
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
