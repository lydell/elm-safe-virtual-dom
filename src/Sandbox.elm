module Sandbox exposing (main)

import Browser
import Html exposing (..)
import Html.Events exposing (..)


main : Program () Model Msg
main =
    Browser.sandbox
        { init = init
        , view = view
        , update = update
        }


type alias Model =
    Int


init : Model
init =
    0


type Msg
    = Next


update : Msg -> Model -> Model
update msg model =
    case msg of
        Next ->
            model + 1


view : Model -> Html Msg
view model =
    div []
        [ text "Count: "
        , text (String.fromInt model)
        , button [ onClick Next ] [ text "Nästa" ]
        ]
