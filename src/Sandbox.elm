module Sandbox exposing (main)

import Browser
import Html exposing (..)
import Html.Attributes
import Html.Events exposing (..)


main : Program () Model Msg
main =
    Browser.sandbox
        { init = init
        , view = view
        , update = update
        }


type alias Model =
    { count : Int
    , text : String
    }


init : Model
init =
    { count = 0
    , text = ""
    }


type Msg
    = Next
    | Input String


update : Msg -> Model -> Model
update msg model =
    case msg of
        Next ->
            { model | count = model.count + 1 }

        Input text ->
            { model | text = text }


view : Model -> Html Msg
view model =
    div []
        [ text "Count: "
        , text (String.fromInt model.count)
        , button [ onClick Next ] [ text "Nästa" ]
        , input [ onInput Input, Html.Attributes.value model.text ] []
        ]
