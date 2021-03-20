module KeyList exposing (main)

import Array exposing (Array)
import Array.Extra
import Browser
import Html exposing (Html)
import Html.Attributes as Attr
import Html.Events exposing (on, onClick, onInput)
import Html.Keyed
import Json.Decode as Decode
import Random
import Random.Array


main : Program () Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }


type alias Model =
    { items : Array Item
    , uid : Int
    , seed : Random.Seed
    }


type alias Item =
    { id : String
    , text : String
    }


init : () -> ( Model, Cmd Msg )
init () =
    let
        items =
            List.range 1 9
                |> List.map initItem
                |> Array.fromList
    in
    ( { items = items
      , uid = Array.length items + 1
      , seed = Random.initialSeed 0
      }
    , Cmd.none
    )


initItem : Int -> Item
initItem id =
    { id = String.fromInt id
    , text = "Item " ++ String.fromInt id
    }


type Msg
    = Add1Clicked
    | ReverseClicked
    | ShuffleClicked
    | ItemInput Int String
    | ItemKeyDown String
    | MoveUpClicked Int
    | MoveDownClicked Int
    | RemoveClicked Int
    | AddAboveClicked Int
    | AddBelowClicked Int


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Add1Clicked ->
            add1 model

        ReverseClicked ->
            reverse model

        ShuffleClicked ->
            shuffle model

        ItemInput index text ->
            ( { model | items = Array.Extra.update index (updateText text) model.items }, Cmd.none )

        ItemKeyDown code ->
            case code of
                "Digit1" ->
                    add1 model

                "Digit2" ->
                    reverse model

                "Digit3" ->
                    shuffle model

                _ ->
                    ( model, Cmd.none )

        MoveUpClicked index ->
            ( { model | items = moveUp index model.items }, Cmd.none )

        MoveDownClicked index ->
            ( { model | items = moveDown index model.items }, Cmd.none )

        RemoveClicked index ->
            ( { model | items = Array.Extra.removeAt index model.items }, Cmd.none )

        AddAboveClicked index ->
            ( { model
                | items = Array.Extra.insertAt index (initItem model.uid) model.items
                , uid = model.uid + 1
              }
            , Cmd.none
            )

        AddBelowClicked index ->
            ( { model
                | items = Array.Extra.insertAt (index + 1) (initItem model.uid) model.items
                , uid = model.uid + 1
              }
            , Cmd.none
            )


add1 : Model -> ( Model, Cmd Msg )
add1 model =
    ( { model
        | items = Array.append model.items (Array.fromList [ initItem model.uid ])
        , uid = model.uid + 1
      }
    , Cmd.none
    )


reverse : Model -> ( Model, Cmd Msg )
reverse model =
    ( { model | items = reverseArray model.items }, Cmd.none )


shuffle : Model -> ( Model, Cmd Msg )
shuffle model =
    let
        ( nextItems, nextSeed ) =
            Random.step (Random.Array.shuffle model.items) model.seed
    in
    ( { model | items = nextItems, seed = nextSeed }, Cmd.none )


updateText : String -> Item -> Item
updateText text item =
    { item | text = text }


reverseArray : Array a -> Array a
reverseArray =
    Array.foldr Array.push Array.empty


moveUp : Int -> Array a -> Array a
moveUp index array =
    case ( Array.get (index - 1) array, Array.get index array ) of
        ( Just above, Just item ) ->
            array
                |> Array.set (index - 1) item
                |> Array.set index above

        _ ->
            array


moveDown : Int -> Array a -> Array a
moveDown index array =
    case ( Array.get index array, Array.get (index + 1) array ) of
        ( Just item, Just below ) ->
            array
                |> Array.set index below
                |> Array.set (index + 1) item

        _ ->
            array


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.none


view : Model -> Html Msg
view model =
    Html.div []
        [ Html.button [ onClick Add1Clicked ] [ Html.text "Add 1" ]
        , Html.button [ onClick ReverseClicked ] [ Html.text "Reverse" ]
        , Html.button [ onClick ShuffleClicked ] [ Html.text "Shuffle" ]
        , Html.Keyed.ul []
            (model.items
                |> Array.toList
                |> List.indexedMap
                    (\index item ->
                        ( item.id
                        , Html.li []
                            [ Html.input
                                [ Attr.value item.text
                                , onInput (ItemInput index)
                                , on "keydown" (Decode.field "code" Decode.string |> Decode.map ItemKeyDown)
                                ]
                                []
                            , Html.button [ onClick (MoveUpClicked index) ] [ Html.text "⬆️" ]
                            , Html.button [ onClick (MoveDownClicked index) ] [ Html.text "⬇️" ]
                            , Html.button [ onClick (AddAboveClicked index) ] [ Html.text "⤴️" ]
                            , Html.button [ onClick (AddBelowClicked index) ] [ Html.text "⤵️" ]
                            , Html.button [ onClick (RemoveClicked index) ] [ Html.text "❌" ]
                            ]
                        )
                    )
            )
        ]
