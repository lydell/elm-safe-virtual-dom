module KitchenSink exposing (main)

import Browser
import Html exposing (..)
import Html.Events exposing (onClick)


main : Program () Model Msg
main =
    Browser.sandbox
        { init = init
        , view = view
        , update = update
        }


type alias Model =
    { property : Int
    , property2 : String
    }


init : Model
init =
    Model 0 "modelInitialValue2"


type Msg
    = Msg1
    | Msg2


update : Msg -> Model -> Model
update msg model =
    case msg of
        Msg1 ->
            { model | property2 = "Updated" }

        Msg2 ->
            model


view : Model -> Html Msg
view model =
    div []
        [ text model.property2
        , button [ onClick Msg1 ] [ text "Next" ]
        ]
